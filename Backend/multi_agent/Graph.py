from typing import Any
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from multi_agent.Agents import (
    security_guard,
    supervisor_agent,
    discovery_agent,
    lending_agent,
    policy_agent,
    general_agent,
    evaluator_agent,
)
from multi_agent.State import CampusLoopState
from multi_agent.rag import retrieve_policy_context

# CONSTANTS --

ALLOWED_AGENTS = {
    "discovery",
    "lending",
    "policy",
    "general",
}

INTENT_MAPPING = {
    "discovery": "search",
    "lending": "borrow",
    "policy": "policy",
    "general": "general",
}

# STATE NORMALIZATION --


def _as_state(state: Any) -> CampusLoopState:
    """
    Normalize LangGraph state into CampusLoopState.

    LangGraph nodes can receive state as a dictionary,
    even when the graph schema is a Pydantic model.
    """

    if isinstance(state, CampusLoopState):
        return state

    return CampusLoopState.model_validate(state)


# DATABASE SESSION --


def _get_db(config: RunnableConfig | None) -> Any:
    """Get the request-scoped SQLAlchemy session."""

    if not config:
        return None

    return config.get("configurable", {}).get("db")


# SECURITY NODE --


def security_node(state: CampusLoopState) -> dict:
    """Validate the incoming message before agent execution."""

    state = _as_state(state)

    is_safe, flags = security_guard(state.user_message)

    if not is_safe:
        return {
            "is_safe": False,
            "security_flags": flags,
            "assistant_reply": (
                "I can't help with requests involving unauthorized "
                "access, private information, or restricted system data."
            ),
        }

    return {
        "is_safe": True,
        "security_flags": [],
    }


def route_after_security(state: CampusLoopState) -> str:
    """Continue only when the message passes security validation."""

    state = _as_state(state)

    if state.is_safe:
        return "supervisor"

    return "blocked"


# SUPERVISOR NODE --


def supervisor_node(state: CampusLoopState) -> dict:
    """
    Select the appropriate specialist agent.

    The Supervisor receives the user message and returns
    intent and planned agent information.
    """

    state = _as_state(state)

    plan = supervisor_agent(
        message=state.user_message,
    )

    planned_agents = plan.get("planned_agents", [])

    selected_agent = planned_agents[0] if planned_agents else "general"

    if selected_agent not in ALLOWED_AGENTS:
        selected_agent = "general"

    selected_intent = INTENT_MAPPING[selected_agent]

    return {
        "intent": selected_intent,
        "intents": [selected_intent],
        "planned_agents": [selected_agent],
        # Reset outputs for this turn.
        "agent_outputs": {},
        "tool_calls": [],
        "search_results": [],
        "knowledge_context": [],
        # Preserve conversation information.
        "conversation_history": state.conversation_history,
        "conversation_context": state.conversation_context,
        # Preserve selected marketplace records.
        "selected_item_id": state.selected_item_id,
        "selected_item_name": state.selected_item_name,
        "selected_request_id": state.selected_request_id,
        "selected_request_item_name": (state.selected_request_item_name),
        "selected_borrower_name": (state.selected_borrower_name),
        "pending_action": state.pending_action,
        "action_confirmed": state.action_confirmed,
        "needs_human_approval": False,
        "action_result": None,
        "assistant_reply": "",
        "errors": [],
        "retry_count": 0,
    }


def route_from_supervisor(state: CampusLoopState) -> str:
    """Route to the selected specialist."""

    state = _as_state(state)

    if state.action_confirmed and state.pending_action:
        return "lending"

    if not state.planned_agents:
        return "finalize"

    selected_agent = state.planned_agents[0]

    if selected_agent not in ALLOWED_AGENTS:
        return "finalize"

    return selected_agent


# DISCOVERY NODE --


def discovery_node(
    state: CampusLoopState,
    config: RunnableConfig,
) -> dict:
    """Search available marketplace items."""

    state = _as_state(state)
    db = _get_db(config)

    reply, results = discovery_agent(
        message=state.user_message,
        user_id=state.user_id,
        db=db,
    )

    outputs = dict(state.agent_outputs)
    outputs["discovery"] = reply

    selected_item_id = None
    selected_item_name = None

    if len(results) == 1:
        selected_item_id = results[0].get("id")
        selected_item_name = results[0].get("name")

    return {
        "current_agent": "discovery",
        "agent_outputs": outputs,
        "search_results": results,
        "selected_item_id": selected_item_id,
        "selected_item_name": selected_item_name,
        "tool_calls": (list(state.tool_calls) + ["search_available_items"]),
    }


# LENDING NODE --


def lending_node(
    state: CampusLoopState,
    config: RunnableConfig,
) -> dict:
    """
    Handle borrowing, approvals, rejection and returns.

    Pending actions are reconstructed using backend state.
    """
    state = _as_state(state)

    db = _get_db(config)

    message = state.user_message
    pending_action = state.pending_action or {}

    is_confirming_pending_action = bool(state.action_confirmed and pending_action)

    pending_request_id = None

    if is_confirming_pending_action:

        action = pending_action.get("action")

        pending_request_id = pending_action.get("request_id")

        if not pending_request_id:
            return {
                "current_agent": "lending",
                "assistant_reply": (
                    "The pending request information is incomplete. "
                    "Please start the action again."
                ),
                "pending_action": None,
                "action_confirmed": False,
                "needs_human_approval": False,
                "planned_agents": [],
            }

        if action == "approve_borrow_request":

            message = f"Approve request ID {pending_request_id}"

        elif action == "reject_borrow_request":

            message = f"Reject request ID {pending_request_id}"

        elif action == "confirm_item_return":

            message = f"Confirm return request ID {pending_request_id}"

        else:
            return {
                "current_agent": "lending",
                "assistant_reply": (
                    "I couldn't recognize the pending action. "
                    "Please start the action again."
                ),
                "pending_action": None,
                "action_confirmed": False,
                "needs_human_approval": False,
                "planned_agents": [],
            }

    result = lending_agent(
        message=message,
        user_id=state.user_id,
        db=db,
        action_confirmed=state.action_confirmed,
        conversation_history=state.conversation_history,
        selected_item_id=state.selected_item_id,
        selected_item_name=state.selected_item_name,
        selected_request_id=(
            pending_request_id
            if pending_request_id is not None
            else state.selected_request_id
        ),
        selected_request_item_name=(state.selected_request_item_name),
        selected_borrower_name=(state.selected_borrower_name),
    )

    outputs = dict(state.agent_outputs)
    outputs["lending"] = result.get(
        "reply",
        "I couldn't complete the lending operation.",
    )

    action_result = result.get("action_result")
    new_pending_action = result.get("pending_action")

    needs_approval = result.get(
        "needs_human_approval",
        False,
    )

    next_pending_action = new_pending_action
    next_action_confirmed = False

    selected_request_id = state.selected_request_id
    selected_request_item_name = state.selected_request_item_name
    selected_borrower_name = state.selected_borrower_name

    if new_pending_action:

        selected_request_id = new_pending_action.get("request_id")

    elif is_confirming_pending_action:

        success = (
            isinstance(action_result, dict) and action_result.get("success") is True
        )

        if success:
            next_pending_action = None
            next_action_confirmed = False

            selected_request_id = None
            selected_request_item_name = None
            selected_borrower_name = None

        else:
            next_pending_action = state.pending_action
            next_action_confirmed = False

    else:
        next_pending_action = None
        next_action_confirmed = False

    return {
        "current_agent": "lending",
        "agent_outputs": outputs,
        "needs_human_approval": needs_approval,
        "pending_action": next_pending_action,
        "action_confirmed": next_action_confirmed,
        "action_result": action_result,
        "selected_request_id": selected_request_id,
        "selected_request_item_name": (selected_request_item_name),
        "selected_borrower_name": selected_borrower_name,
        "tool_calls": (list(state.tool_calls) + result.get("tool_calls", [])),
    }


# POLICY NODE --


def policy_node(
    state: CampusLoopState,
    config: RunnableConfig,
) -> dict:
    """Retrieve verified policy context and generate an answer."""

    state = _as_state(state)
    db = _get_db(config)

    knowledge_context = []
    errors = list(state.errors)

    try:
        knowledge_context = retrieve_policy_context(
            question=state.user_message,
            db=db,
            top_k=4,
        )

    except Exception as exc:
        errors.append(f"Policy retrieval failed: " f"{type(exc).__name__}: {exc}")

    reply = policy_agent(
        message=state.user_message,
        context=knowledge_context,
        conversation_history=state.conversation_history,
    )

    outputs = dict(state.agent_outputs)
    outputs["policy"] = reply

    return {
        "current_agent": "policy",
        "agent_outputs": outputs,
        "knowledge_context": knowledge_context,
        "errors": errors,
        "tool_calls": (list(state.tool_calls) + ["retrieve_policy_context"]),
    }


# GENERAL NODE --


def general_node(state: CampusLoopState) -> dict:
    """Handle general campus and platform questions."""

    state = _as_state(state)
    reply = general_agent(
        message=state.user_message,
    )

    outputs = dict(state.agent_outputs)
    outputs["general"] = reply

    return {
        "current_agent": "general",
        "agent_outputs": outputs,
    }


# FINALIZE NODE --


def finalize_node(state: CampusLoopState) -> dict:
    """Build the final assistant response."""

    state = _as_state(state)

    replies = [
        str(reply).strip()
        for reply in state.agent_outputs.values()
        if reply and str(reply).strip()
    ]

    if replies:

        final_reply = "\n\n".join(replies)

    else:

        final_reply = (
            state.assistant_reply
            or "I couldn't find a suitable answer. Please try again."
        )

    if state.needs_human_approval:

        final_reply += "\n\nPlease confirm if you want me to proceed with this action."

    return {
        "assistant_reply": final_reply,
    }


# EVALUATOR NODE --


def evaluator_node(state: CampusLoopState) -> dict:
    """Evaluate the response against available evidence."""

    state = _as_state(state)

    evidence = {
        "search_results": state.search_results,
        "knowledge_context": state.knowledge_context,
        "action_result": state.action_result,
    }

    evaluation = evaluator_agent(
        message=state.user_message,
        response=state.assistant_reply,
        evidence=evidence,
    )

    errors = list(state.errors)

    if not evaluation.get("approved", False):

        errors.append(
            evaluation.get(
                "feedback",
                "Response evaluation was unsuccessful.",
            )
        )

    return {
        "evaluation_score": evaluation.get("score"),
        "evaluation_feedback": evaluation.get("feedback", ""),
        "errors": errors,
    }


# GRAPH BUILDER --


def build_graph(checkpointer=None):
    """
    Build and compile the CampusLoop multi-agent workflow.

    Optional checkpointer can be supplied during compilation.
    """

    workflow = StateGraph(CampusLoopState)

    ## NODES --
    workflow.add_node("security", security_node)
    workflow.add_node("supervisor", supervisor_node)

    workflow.add_node("discovery", discovery_node)
    workflow.add_node("lending", lending_node)
    workflow.add_node("policy", policy_node)
    workflow.add_node("general", general_node)

    workflow.add_node("finalize", finalize_node)
    workflow.add_node("evaluator", evaluator_node)

    ## EDGES --
    workflow.add_edge(START, "security")

    workflow.add_conditional_edges(
        "security",
        route_after_security,
        {
            "supervisor": "supervisor",
            "blocked": END,
        },
    )

    workflow.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "discovery": "discovery",
            "lending": "lending",
            "policy": "policy",
            "general": "general",
            "finalize": "finalize",
        },
    )

    for agent_name in ALLOWED_AGENTS:

        workflow.add_edge(
            agent_name,
            "finalize",
        )

    workflow.add_edge(
        "finalize",
        "evaluator",
    )

    workflow.add_edge(
        "evaluator",
        END,
    )

    return workflow.compile(
        checkpointer=checkpointer,
    )


graph = build_graph()


def run_assistant(
    state: CampusLoopState | dict,
    db=None,
    checkpointer_config: dict | None = None,
) -> CampusLoopState:
    """
    Execute the graph with authenticated user context.

    Parameters:
        state:
            Initial CampusLoopState or dictionary.

        db:
            Request-scoped SQLAlchemy session.

        checkpointer_config:
            Optional configurable values such as thread_id.
            Requires a checkpointer during graph compilation.
    """

    initial_state = _as_state(state)

    state_data = initial_state.model_dump()

    configurable = {
        "db": db,
    }

    if checkpointer_config:

        configurable.update(checkpointer_config)

    result = graph.invoke(
        state_data,
        config={
            "configurable": configurable,
        },
    )

    return CampusLoopState.model_validate(result)

from typing import Any, Literal, Annotated
from pydantic import BaseModel, Field, ConfigDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

AgentName = Literal[
    "discovery",
    "lending",
    "policy",
    "general",
]

IntentName = Literal[
    "search",
    "borrow",
    "policy",
    "general",
]


class CampusLoopState(BaseModel):
    """
    Shared Pydantic state for the CampusLoop AI multi-agent graph.

    Stores authenticated user context, conversation history,
    supervisor decisions, specialist outputs, tool execution,
    action confirmation, security and evaluation information.
    """

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        validate_assignment=True,
    )

    # AUTHENTICATED USER AND CONVERSATION --

    user_id: int | None = None
    conversation_id: int | None = None

    # CONVERSATION MESSAGES --

    messages: Annotated[
        list[BaseMessage],
        add_messages,
    ] = Field(default_factory=list)

    user_message: str = ""

    conversation_history: list[dict[str, str]] = Field(default_factory=list)

    conversation_context: dict[str, Any] = Field(default_factory=dict)

    # SELECTED MARKETPLACE RECORDS --

    selected_item_id: int | None = None
    selected_item_name: str | None = None

    selected_request_id: int | None = None
    selected_request_item_name: str | None = None
    selected_borrower_name: str | None = None

    # SUPERVISOR DECISION --

    selected_agent: AgentName | None = None

    intent: IntentName = "general"

    intents: list[IntentName] = Field(default_factory=list)

    next_agent: AgentName = "general"

    planned_agents: list[AgentName] = Field(default_factory=list)

    current_agent: str = ""

    # SPECIALIST OUTPUT --

    assistant_reply: str = ""

    agent_outputs: dict[str, str] = Field(default_factory=dict)

    search_results: list[dict[str, Any]] = Field(default_factory=list)

    knowledge_context: list[dict[str, Any]] = Field(default_factory=list)

    # TOOL EXECUTION --

    tool_calls: list[str] = Field(default_factory=list)

    tool_results: dict[str, Any] = Field(default_factory=dict)

    # ACTION CONFIRMATION --

    needs_human_approval: bool = False

    action_confirmed: bool = False

    pending_action: dict[str, Any] | None = None

    action_result: dict[str, Any] | None = None

    # SECURITY --

    is_safe: bool = True

    security_flags: list[str] = Field(default_factory=list)

    # EVALUATION --

    evaluation_score: float | None = None

    evaluation_feedback: str = ""

    # ERROR HANDLING --

    error: str | None = None

    errors: list[str] = Field(default_factory=list)

    retry_count: int = 0

    max_retries: int = 2

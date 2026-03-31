from typing import Any, Literal, TypedDict

from app.models.order import Order, OrderStatus
from app.modules.kitchen.ws_manager import manager as ws_manager

OrderSocketEventType = Literal["NEW_ORDER", "ORDER_UPDATED"]


class ModifierSnapshotPayload(TypedDict, total=False):
    source_id: int | None
    source_type: str
    group_key: str
    group_label: str
    choice: str
    name: str
    price: float


class OrderSocketItemPayload(TypedDict, total=False):
    id: int
    product_name: str
    quantity: int
    notes: str | None
    modifiers_snapshot: list[ModifierSnapshotPayload]


class OrderSocketPayload(TypedDict, total=False):
    order_id: int
    order_number: int
    status: str
    previous_status: str
    table_id: int | None
    table_label: str
    customer_name: str | None
    item_count: int
    created_at: str | None
    items: list[OrderSocketItemPayload]
    changed_item_id: int
    changed_item_state: str


class OrderSocketMessage(TypedDict):
    type: OrderSocketEventType
    data: OrderSocketPayload


def _serialize_status(status: OrderStatus | str | None) -> str | None:
    if status is None:
        return None
    if isinstance(status, OrderStatus):
        return status.value
    return str(status)


def _build_table_label(order: Order) -> str:
    if order.table:
        return f"Mesa {order.table.number}"
    return "Para llevar"


def _serialize_modifier_snapshot(modifiers_snapshot: Any) -> list[ModifierSnapshotPayload]:
    if not isinstance(modifiers_snapshot, list):
        return []

    serialized: list[ModifierSnapshotPayload] = []
    for raw_modifier in modifiers_snapshot:
        if not isinstance(raw_modifier, dict):
            continue

        name = str(raw_modifier.get("name", "")).strip()
        choice = str(raw_modifier.get("choice", "")).strip()
        if not name or not choice:
            continue

        raw_source_id = raw_modifier.get("source_id")
        source_id: int | None = None
        if raw_source_id is not None:
            try:
                source_id = int(raw_source_id)
            except (TypeError, ValueError):
                source_id = None

        try:
            price = float(raw_modifier.get("price", 0) or 0)
        except (TypeError, ValueError):
            price = 0.0

        serialized.append(
            {
                "source_id": source_id,
                "source_type": str(raw_modifier.get("source_type", "")),
                "group_key": str(raw_modifier.get("group_key", "")),
                "group_label": str(raw_modifier.get("group_label", "")),
                "choice": choice,
                "name": name,
                "price": price,
            }
        )

    return serialized


def _serialize_order_items(order: Order) -> list[OrderSocketItemPayload]:
    return [
        {
            "id": item.id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "notes": item.notes,
            "modifiers_snapshot": _serialize_modifier_snapshot(
                getattr(item, "modifiers_snapshot", None)
            ),
        }
        for item in order.items
    ]


def build_order_socket_message(
    event_type: OrderSocketEventType,
    order: Order,
    previous_status: OrderStatus | str | None = None,
    changed_item_id: int | None = None,
    changed_item_state: str | None = None,
) -> OrderSocketMessage:
    payload: OrderSocketPayload = {
        "order_id": order.id,
        "order_number": order.id,
        "status": _serialize_status(order.status) or "",
        "table_id": order.table_id,
        "table_label": _build_table_label(order),
        "customer_name": order.customer_name,
        "item_count": len(order.items),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": _serialize_order_items(order),
    }

    serialized_previous_status = _serialize_status(previous_status)
    if serialized_previous_status:
        payload["previous_status"] = serialized_previous_status

    if changed_item_id is not None:
        payload["changed_item_id"] = changed_item_id

    if changed_item_state:
        payload["changed_item_state"] = changed_item_state

    return {
        "type": event_type,
        "data": payload,
    }


async def broadcast_order_update(company_id: int, message: dict[str, Any]) -> None:
    await ws_manager.broadcast_to_company(company_id, message)

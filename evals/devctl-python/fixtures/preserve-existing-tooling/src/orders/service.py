from dataclasses import dataclass, replace


class OrderNotFoundError(Exception):
    """Raised when an order does not exist."""


@dataclass(frozen=True, slots=True)
class Order:
    id: str
    archived: bool = False


class OrderService:
    """Own order operations."""

    def archive(self, orders: tuple[Order, ...], order_id: str) -> tuple[Order, ...]:
        """Archive one order while preserving the remaining order sequence."""
        return tuple(replace(order, archived=True) for order in orders)

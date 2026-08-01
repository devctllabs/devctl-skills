import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from orders.service import Order, OrderService


class OrderServiceTests(unittest.TestCase):
    def test_archiving_an_already_archived_order_is_idempotent(self) -> None:
        service = OrderService()
        order = Order(id="one", archived=True)

        self.assertEqual(service.archive((order,), "one"), (order,))


if __name__ == "__main__":
    unittest.main()

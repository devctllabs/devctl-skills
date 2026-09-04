import unittest

from shipping import _quote


class PrivateQuoteTests(unittest.TestCase):
    def test_local_economy_light(self) -> None:
        self.assertEqual(_quote("local", 1, False), 3)

    def test_national_express_heavy(self) -> None:
        self.assertEqual(_quote("national", 2, True), 16)


if __name__ == "__main__":
    unittest.main()

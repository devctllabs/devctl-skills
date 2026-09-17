import unittest

from booking import can_refund


class RefundTests(unittest.TestCase):
    def test_cutoff(self):
        self.assertTrue(can_refund(24))
        self.assertTrue(can_refund(25))
        self.assertFalse(can_refund(23))


if __name__ == "__main__":
    unittest.main()

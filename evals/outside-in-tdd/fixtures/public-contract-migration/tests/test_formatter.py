import unittest

from formatter import format_name


class FormatNameTests(unittest.TestCase):
    def test_formats_last_name_first(self) -> None:
        self.assertEqual(format_name(" Ada ", " Lovelace "), "Lovelace, Ada")


if __name__ == "__main__":
    unittest.main()

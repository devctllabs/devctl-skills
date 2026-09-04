import unittest

from cli import render


class RenderTests(unittest.TestCase):
    def test_renders_the_existing_name_format(self) -> None:
        self.assertEqual(render("Ada", "Lovelace"), "Lovelace, Ada")


if __name__ == "__main__":
    unittest.main()

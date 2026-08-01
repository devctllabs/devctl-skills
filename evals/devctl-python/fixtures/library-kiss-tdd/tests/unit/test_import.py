import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parents[2] / "src"))


class ImportTests(unittest.TestCase):
    def test_package_import_has_no_side_effects(self) -> None:
        import acme_names

        self.assertEqual(acme_names.__name__, "acme_names")


if __name__ == "__main__":
    unittest.main()

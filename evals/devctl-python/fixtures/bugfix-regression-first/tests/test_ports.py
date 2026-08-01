import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

from netcfg import parse_port


class PortTests(unittest.TestCase):
    def test_parses_valid_port(self) -> None:
        self.assertEqual(parse_port("443"), 443)

    def test_rejects_above_maximum(self) -> None:
        with self.assertRaises(ValueError):
            parse_port("65536")


if __name__ == "__main__":
    unittest.main()

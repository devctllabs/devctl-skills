# Shipping Quote

`shipping_quote(region, weight, express)` returns these integer prices:

| Region | Economy ≤1kg | Economy >1kg | Express ≤1kg | Express >1kg |
| --- | ---: | ---: | ---: | ---: |
| `local` | 3 | 5 | 7 | 10 |
| `national` | 6 | 9 | 12 | 16 |
| any other region | 8 | 12 | 15 | 20 |

Non-positive weight raises `ValueError`. Run tests with:

```text
python3 -m unittest discover -s tests -v
```

# Hotspot App

Run the existing checks with:

```text
PYTHONPATH=src pytest -q tests
ruff check .
mypy src tests
complexipy src/hotspot_app --ignore-complexity --top 20
PYTHONPATH=src lint-imports --config pyproject.toml
```


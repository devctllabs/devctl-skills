def find_name(records: list[dict[str, str]], record_id: str) -> str | None:
    for record in records:
        if record["id"] == record_id:
            return record["name"]
    return None

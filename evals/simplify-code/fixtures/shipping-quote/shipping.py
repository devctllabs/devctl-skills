def shipping_quote(region: str, weight: float, express: bool) -> int:
    return _quote(region, weight, express)


def _quote(region: str, weight: float, express: bool) -> int:
    if weight <= 0:
        raise ValueError("weight must be positive")
    if region == "local":
        if express:
            if weight <= 1:
                return 7
            return 10
        return {True: 3, False: 5}[weight <= 1]
    if region == "national":
        if express:
            return {True: 12, False: 16}[weight <= 1]
        return {True: 6, False: 9}[weight <= 1]
    if express:
        return {True: 15, False: 20}[weight <= 1]
    return {True: 8, False: 12}[weight <= 1]

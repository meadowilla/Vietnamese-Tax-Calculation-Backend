def calculate_progressive_tax(taxable_income):
    brackets = [
        (0, 5_000_000, 0.05),
        (5_000_000, 10_000_000, 0.10),
        (10_000_000, 18_000_000, 0.15),
        (18_000_000, 32_000_000, 0.20),
        (32_000_000, 52_000_000, 0.25),
        (52_000_000, 80_000_000, 0.30),
        (80_000_000, float('inf'), 0.35),
    ]
    tax = 0
    for lower, upper, rate in brackets:
        if taxable_income > lower:
            taxed_amount = min(taxable_income, upper) - lower
            tax += taxed_amount * rate
    return round(tax)


def compute_tax(data):
    personal_deduction = 11_000_000
    dependent_deduction = 4_400_000 * data.get("dependents", 0)
    residency_status = data.get("residency_status", "resident")

    total_income = 0
    tax_paid = {"business": 0, "one_time": 0}
    tax_need_to_pay = {"business": 0, "one_time": 0}

    # === Nhóm 1: Kinh doanh ===

    # HĐLĐ dài hạn (tính như kinh doanh thường xuyên)
    income_labor = data.get("income_labor_contract", 0)
    total_income += income_labor
    if data.get("taxed_labor_contract"):
        tax_paid["business"] += calculate_progressive_tax(income_labor)
    else:
        if residency_status == "resident":
            taxable = max(income_labor - personal_deduction - dependent_deduction, 0)
            tax_need_to_pay["business"] += calculate_progressive_tax(taxable)
        else:
            tax_need_to_pay["business"] += round(income_labor * 0.20)

    # Không HĐ / HĐ ngắn hạn
    income_short = data.get("income_no_contract", 0)
    total_income += income_short
    if data.get("taxed_no_contract"):
        tax_paid["business"] += round(income_short * 0.10)
    else:
        if income_short * 12 > 132_000_000:
            tax_need_to_pay["business"] += round(income_short * 0.10)

    # HĐLĐ nước ngoài
    income_foreign = data.get("income_foreign_contract", 0)
    total_income += income_foreign
    tax_foreign = round(income_foreign * 0.20)
    if data.get("deducted_tax_abroad"):
        tax_paid["business"] += tax_foreign
    else:
        tax_need_to_pay["business"] += tax_foreign

    # Kinh doanh
    if data.get("use_flat_rate", True):
        rates = {
            "distribution": 0.015,
            "service": 0.07,
            "rent": 0.10,
            "agent": 0.05,
            "production": 0.045,
            "others": 0.03
        }
        for key, val in data.get("business_income_flat", {}).items():
            total_income += val
            tax_need_to_pay["business"] += round(val * rates.get(key, 0))
    else:
        net = data.get("business_income_net", {})
        gross = net.get("gross", 0)
        cost = net.get("cost", 0)
        profit = max(gross - cost - personal_deduction - dependent_deduction, 0)
        total_income += gross
        tax_need_to_pay["business"] += calculate_progressive_tax(profit)

    # === Nhóm 2: Thu nhập từng lần phát sinh ===
    once_off_income = data.get("once_off_income", {})
    taxed_once = data.get("taxed_once_off", {})
    once_rates = {
        "real_estate": 0.02,
        "investment": 0.05,
        "capital_transfer": 0.20,
        "royalty": 0.05,
        "lottery": 0.10,
        "inheritance": 0.10
    }

    for key, val in once_off_income.items():
        total_income += val
        tax = round(val * once_rates.get(key, 0))
        if taxed_once.get(key, False):
            tax_paid["one_time"] += tax
        else:
            tax_need_to_pay["one_time"] += tax

    return {
        "total_income": round(total_income),
        "tax_paid": {k: round(v) for k, v in tax_paid.items()},
        "tax_need_to_pay": {k: round(v) for k, v in tax_need_to_pay.items()}
    }


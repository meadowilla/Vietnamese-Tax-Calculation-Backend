from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict
from calculations.testtax import compute_tax

app = FastAPI()

# Input model định nghĩa format dữ liệu từ client
class TaxRequest(BaseModel):
    salary_amount: int
    is_net_salary: bool
    contract_type: str = "long_term"
    residency_status: str = "resident"
    dependents: int = 0
    region: int = 1
    additional_income: Optional[Dict[str, int]] = {}
    company_bonus: Optional[int] = 0
    already_withheld: Optional[Dict[str, bool]] = {}

# API endpoint nhận JSON input và trả về kết quả tính thuế
@app.post("/calculate-tax")
def calculate_tax(data: TaxRequest):
    gross_salary = data.salary_amount if not data.is_net_salary else None
    net_salary = data.salary_amount if data.is_net_salary else None

    result = compute_tax(
        gross_salary=gross_salary,
        net_salary=net_salary,
        contract_type=data.contract_type,
        residency_status=data.residency_status,
        num_dependents=data.dependents,
        region=data.region,
        extra_incomes=data.additional_income,
        company_bonus=data.company_bonus,
        already_withheld=data.already_withheld
    )

    return result

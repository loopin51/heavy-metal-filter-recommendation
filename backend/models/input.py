"""입력 데이터 모델 (Pydantic v2)."""

from enum import Enum

from pydantic import BaseModel, field_validator


class Scenario(str, Enum):
    industrial = "industrial"
    mining = "mining"
    agricultural = "agricultural"
    groundwater = "groundwater"
    urban = "urban"


class MetalId(str, Enum):
    Pb = "Pb2+"
    Cu = "Cu2+"
    Cd = "Cd2+"
    Cr3 = "Cr3+"
    Cr6 = "Cr6+"
    Hg = "Hg2+"
    As3 = "As3+"
    As5 = "As5+"
    Zn = "Zn2+"
    Ni = "Ni2+"


class Level(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class PHRange(str, Enum):
    acidic = "acidic"
    neutral = "neutral"
    alkaline = "alkaline"


class FilterInput(BaseModel):
    scenario: Scenario
    metals: list[MetalId]
    level: Level
    pH_range: PHRange

    @field_validator("metals")
    @classmethod
    def metals_not_empty(cls, v: list[MetalId]) -> list[MetalId]:
        if not v:
            raise ValueError("중금속을 1개 이상 선택해야 합니다.")
        return v

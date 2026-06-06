import pytest

from ..engine.data_loader import load_db
from ..engine.recommender import recommend
from ..models.input import FilterInput, Level, MetalId, PHRange, Scenario


@pytest.fixture
def db():
    return load_db()


def make_input(**kwargs):
    defaults = dict(
        scenario=Scenario.industrial,
        metals=[MetalId.Pb],
        level=Level.low,
        pH_range=PHRange.neutral,
    )
    defaults.update(kwargs)
    return FilterInput(**defaults)


# ── 오염도 규칙 ──────────────────────────────────────────
def test_level_low_no_chitosan_no_biochar(db):
    result = recommend(make_input(level=Level.low), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" not in ids
    assert "biochar_modified" not in ids


def test_level_medium_has_chitosan_no_biochar(db):
    result = recommend(make_input(level=Level.medium), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" in ids
    assert "biochar_modified" not in ids


def test_level_high_has_chitosan_and_biochar(db):
    result = recommend(make_input(level=Level.high), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "chitosan" in ids
    assert "biochar_modified" in ids


# ── pH 규칙 ──────────────────────────────────────────────
def test_pH_acidic_adds_calcium_carbonate_first(db):
    result = recommend(make_input(pH_range=PHRange.acidic), db)
    assert result.filter_stack[0].material_id == "calcium_carbonate"


def test_pH_neutral_no_calcium_carbonate(db):
    result = recommend(make_input(pH_range=PHRange.neutral), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "calcium_carbonate" not in ids


def test_pH_alkaline_has_warning(db):
    result = recommend(make_input(pH_range=PHRange.alkaline), db)
    codes = [w.code for w in result.warnings]
    assert "ALKALINE_PRECIPITATION" in codes


# ── 금속 특화 규칙 ────────────────────────────────────────
def test_As5_adds_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.As5]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" in ids


def test_As3_adds_mno2_and_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.As3]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "mno2" in ids
    assert "iron_oxide" in ids


def test_Cr6_adds_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.Cr6]), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" in ids


def test_Pb_only_no_iron_oxide(db):
    result = recommend(make_input(metals=[MetalId.Pb], level=Level.low), db)
    ids = [l.material_id for l in result.filter_stack]
    assert "iron_oxide" not in ids


# ── 필수 레이어 항상 포함 ─────────────────────────────────
def test_mandatory_layers_always_present(db):
    result = recommend(make_input(metals=[MetalId.Pb]), db)
    ids = [l.material_id for l in result.filter_stack]
    for required in ["sand", "zeolite_natural", "activated_carbon", "gravel"]:
        assert required in ids


def test_gravel_always_last(db):
    result = recommend(
        make_input(metals=[MetalId.Pb, MetalId.As5], level=Level.high, pH_range=PHRange.acidic), db
    )
    assert result.filter_stack[-1].material_id == "gravel"


def test_calcium_carbonate_always_first_when_acidic(db):
    result = recommend(
        make_input(metals=[MetalId.As3, MetalId.Pb], level=Level.high, pH_range=PHRange.acidic), db
    )
    assert result.filter_stack[0].material_id == "calcium_carbonate"


# ── 설명 가능성 ───────────────────────────────────────────
def test_each_layer_has_supporting_records_or_mandatory(db):
    result = recommend(make_input(metals=[MetalId.Pb, MetalId.Cu], level=Level.medium), db)
    for layer in result.filter_stack:
        if not layer.is_mandatory:
            # 조건부 레이어는 trigger 명시 필수
            assert layer.trigger is not None and len(layer.trigger) > 0


def test_disclaimer_always_present(db):
    result = recommend(make_input(), db)
    assert result.disclaimer is not None and len(result.disclaimer) > 50


def test_column_correction_warning_always_present(db):
    result = recommend(make_input(), db)
    codes = [w.code for w in result.warnings]
    assert "COLUMN_CORRECTION" in codes


# ── 엣지 케이스 ───────────────────────────────────────────
def test_all_metals_no_crash(db):
    all_metals = list(MetalId)
    result = recommend(
        make_input(metals=all_metals, level=Level.high, pH_range=PHRange.acidic), db
    )
    assert len(result.filter_stack) > 0


def test_single_metal_hg(db):
    result = recommend(make_input(metals=[MetalId.Hg], level=Level.medium), db)
    codes = [w.code for w in result.warnings]
    assert "HG_ENHANCED_AC" in codes


def test_Cr6_and_Pb_conflict_warning(db):
    result = recommend(make_input(metals=[MetalId.Cr6, MetalId.Pb], level=Level.high), db)
    codes = [w.code for w in result.warnings]
    assert "CR6_PH_CONFLICT" in codes


def test_removal_estimate_has_correction_note(db):
    result = recommend(make_input(metals=[MetalId.Pb, MetalId.Cu], level=Level.medium), db)
    for metal, est in result.metal_removal.items():
        assert est.correction_applied is not None and len(est.correction_applied) > 0

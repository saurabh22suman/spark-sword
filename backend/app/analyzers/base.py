"""Base classes for optimization detectors.

All detectors follow these principles:
- Evidence-based: Every insight references measurable Spark signals
- Confidence-labeled: All insights include confidence levels
- Non-prescriptive: Never claim guaranteed performance improvements
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.models.spark_events import ParsedEventLog


class Confidence(str, Enum):
    """Confidence level for insights."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Insight:
    """An optimization insight with evidence and confidence.

    Every insight must include:
    - What Spark did
    - Why it did it
    - What can be changed
    - Risk & confidence level
    """

    insight_type: str
    title: str
    description: str
    evidence: list[str] = field(default_factory=list)
    confidence: Confidence = Confidence.MEDIUM
    affected_stages: list[int] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    conditions: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert insight to dictionary."""
        return {
            "type": self.insight_type,
            "title": self.title,
            "description": self.description,
            "evidence": self.evidence,
            "confidence": self.confidence.value,
            "affected_stages": self.affected_stages,
            "suggestions": self.suggestions,
            "conditions": self.conditions,
            "metrics": self.metrics,
        }


class BaseDetector(ABC):
    """Base class for all optimization detectors."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Return detector name."""
        ...

    @abstractmethod
    def detect(self, parsed_log: ParsedEventLog) -> list[Insight]:
        """Run detection and return insights.

        Args:
            parsed_log: The parsed Spark event log.

        Returns:
            List of insights detected.
        """
        ...

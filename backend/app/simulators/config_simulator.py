"""Config Impact Simulator.

Helps users understand how Spark configuration changes affect
execution behavior through:
- Explanations of what each config does
- Impact predictions based on DataFrame shape
- Trade-off analysis between different settings

IMPORTANT: This provides educational insights and estimates,
not guaranteed performance predictions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal, Optional

from app.simulators.shape_playground import DataFrameShape


class ConfigCategory(str, Enum):
    """Categories of Spark configurations."""
    
    SHUFFLE = "shuffle"
    JOIN = "join"
    MEMORY = "memory"
    ADAPTIVE = "adaptive"
    EXECUTION = "execution"
    IO = "io"
    OTHER = "other"


class ImpactLevel(str, Enum):
    """Impact level of a config change."""
    
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NEGLIGIBLE = "negligible"


class ConfigType(str, Enum):
    """Type of config value."""
    
    NUMERIC = "numeric"
    BOOLEAN = "boolean"
    BYTES = "bytes"
    STRING = "string"
    DURATION = "duration"


@dataclass
class SparkConfig:
    """Definition of a Spark configuration parameter."""
    
    name: str
    description: str
    category: ConfigCategory
    default_value: str
    config_type: ConfigType
    min_value: Optional[str] = None
    max_value: Optional[str] = None
    
    # For documentation
    spark_version: str = "3.0+"
    related_configs: list[str] = field(default_factory=list)


@dataclass
class ConfigImpact:
    """Impact analysis of a config change."""
    
    config_name: str
    current_value: str
    new_value: str
    impact_level: ImpactLevel
    explanation: str
    
    # Detailed analysis
    benefits: list[str] = field(default_factory=list)
    drawbacks: list[str] = field(default_factory=list)
    
    # Warnings
    has_warning: bool = False
    warning_message: str = ""
    
    # Estimates
    estimated_shuffle_change_pct: float = 0.0
    estimated_memory_change_pct: float = 0.0


@dataclass
class ConfigOption:
    """An option in trade-off analysis."""
    
    value: str
    impact: ConfigImpact


@dataclass
class ConfigRecommendation:
    """Recommendation for a config value."""
    
    config_name: str
    current_value: Optional[str]
    recommended_value: str
    reasoning: str
    confidence: Literal["high", "medium", "low"]


# Define known Spark configurations
SPARK_CONFIGS: dict[str, SparkConfig] = {
    "spark.sql.shuffle.partitions": SparkConfig(
        name="spark.sql.shuffle.partitions",
        description=(
            "The number of partitions to use when shuffling data for joins or aggregations. "
            "More partitions mean smaller tasks but more scheduling overhead. "
            "Fewer partitions mean larger tasks that may cause memory issues."
        ),
        category=ConfigCategory.SHUFFLE,
        default_value="200",
        config_type=ConfigType.NUMERIC,
        min_value="1",
        related_configs=["spark.sql.adaptive.coalescePartitions.enabled"],
    ),
    "spark.sql.autoBroadcastJoinThreshold": SparkConfig(
        name="spark.sql.autoBroadcastJoinThreshold",
        description=(
            "Maximum size in bytes for a table to be broadcast to all worker nodes. "
            "Broadcast joins avoid shuffle by sending the smaller table to all executors. "
            "Set to -1 to disable broadcast joins entirely."
        ),
        category=ConfigCategory.JOIN,
        default_value="10485760",  # 10MB
        config_type=ConfigType.BYTES,
        min_value="-1",
        related_configs=["spark.sql.adaptive.autoBroadcastJoinThreshold"],
    ),
    "spark.sql.adaptive.enabled": SparkConfig(
        name="spark.sql.adaptive.enabled",
        description=(
            "Enables Adaptive Query Execution (AQE) which optimizes query plans at runtime. "
            "AQE can dynamically coalesce partitions, switch join strategies, and handle skew. "
            "Generally recommended for most workloads in Spark 3.0+."
        ),
        category=ConfigCategory.ADAPTIVE,
        default_value="true",
        config_type=ConfigType.BOOLEAN,
        spark_version="3.0+",
        related_configs=[
            "spark.sql.adaptive.coalescePartitions.enabled",
            "spark.sql.adaptive.skewJoin.enabled",
        ],
    ),
    "spark.sql.adaptive.coalescePartitions.enabled": SparkConfig(
        name="spark.sql.adaptive.coalescePartitions.enabled",
        description=(
            "When AQE is enabled, this allows coalescing partitions after shuffle "
            "to reduce the number of output partitions and improve efficiency."
        ),
        category=ConfigCategory.ADAPTIVE,
        default_value="true",
        config_type=ConfigType.BOOLEAN,
        spark_version="3.0+",
    ),
    "spark.sql.adaptive.skewJoin.enabled": SparkConfig(
        name="spark.sql.adaptive.skewJoin.enabled",
        description=(
            "When AQE is enabled, this allows handling skewed joins by splitting "
            "skewed partitions into smaller sub-partitions."
        ),
        category=ConfigCategory.ADAPTIVE,
        default_value="true",
        config_type=ConfigType.BOOLEAN,
        spark_version="3.0+",
    ),
    "spark.executor.memory": SparkConfig(
        name="spark.executor.memory",
        description=(
            "Amount of memory to use per executor process. "
            "More memory allows larger data processing per task but uses more cluster resources."
        ),
        category=ConfigCategory.MEMORY,
        default_value="1g",
        config_type=ConfigType.BYTES,
        min_value="512m",
    ),
    "spark.executor.cores": SparkConfig(
        name="spark.executor.cores",
        description=(
            "Number of cores to use per executor. "
            "More cores allow more concurrent tasks per executor."
        ),
        category=ConfigCategory.EXECUTION,
        default_value="1",
        config_type=ConfigType.NUMERIC,
        min_value="1",
    ),
    "spark.default.parallelism": SparkConfig(
        name="spark.default.parallelism",
        description=(
            "Default number of partitions for RDD operations. "
            "Usually set to total cores across all executors."
        ),
        category=ConfigCategory.EXECUTION,
        default_value="200",
        config_type=ConfigType.NUMERIC,
        min_value="1",
    ),
}


class ConfigSimulator:
    """Simulator for Spark configuration impact analysis."""
    
    def __init__(self) -> None:
        """Initialize with known configurations."""
        self.configs = SPARK_CONFIGS.copy()
    
    def get_config(self, name: str) -> Optional[SparkConfig]:
        """Get configuration definition by name.
        
        Args:
            name: Full config name (e.g., spark.sql.shuffle.partitions).
            
        Returns:
            SparkConfig if found, None otherwise.
        """
        return self.configs.get(name)
    
    def list_configs(
        self,
        category: Optional[ConfigCategory] = None,
    ) -> list[SparkConfig]:
        """List all known configurations.
        
        Args:
            category: Filter by category if provided.
            
        Returns:
            List of matching configurations.
        """
        configs = list(self.configs.values())
        if category:
            configs = [c for c in configs if c.category == category]
        return configs
    
    def simulate_config_change(
        self,
        config_name: str,
        current_value: str,
        new_value: str,
        shape: DataFrameShape,
    ) -> Optional[ConfigImpact]:
        """Simulate the impact of changing a configuration.
        
        Args:
            config_name: Name of the config to change.
            current_value: Current config value.
            new_value: Proposed new value.
            shape: DataFrame shape for context.
            
        Returns:
            ConfigImpact analysis, or None if config unknown.
        """
        config = self.get_config(config_name)
        if not config:
            return None
        
        # Dispatch to specific handler
        if config_name == "spark.sql.shuffle.partitions":
            return self._simulate_shuffle_partitions(
                current_value, new_value, shape
            )
        elif config_name == "spark.sql.autoBroadcastJoinThreshold":
            return self._simulate_broadcast_threshold(
                current_value, new_value, shape
            )
        elif config_name == "spark.sql.adaptive.enabled":
            return self._simulate_adaptive_execution(
                current_value, new_value, shape
            )
        else:
            # Generic impact
            return self._simulate_generic(
                config_name, current_value, new_value, shape
            )
    
    def _simulate_shuffle_partitions(
        self,
        current_value: str,
        new_value: str,
        shape: DataFrameShape,
    ) -> ConfigImpact:
        """Simulate shuffle partitions change."""
        current = int(current_value)
        new = int(new_value)
        
        # Calculate data per partition
        data_size = shape.total_size_bytes
        current_per_partition = data_size / current if current > 0 else data_size
        new_per_partition = data_size / new if new > 0 else data_size
        
        benefits = []
        drawbacks = []
        has_warning = False
        warning_msg = ""
        
        # Analyze impact
        if new > current:
            # More partitions
            benefits.append("Smaller task sizes reduce memory pressure per task")
            benefits.append("Better parallelism if cluster has enough cores")
            
            if new_per_partition < 1_000_000:  # Less than 1MB per partition
                drawbacks.append("Very small partitions increase scheduling overhead")
                has_warning = True
                warning_msg = (
                    f"With {new} partitions, each task processes only "
                    f"~{new_per_partition / 1000:.0f}KB. Consider fewer partitions."
                )
            
            if data_size < 100_000_000:  # Less than 100MB total
                drawbacks.append("Small data doesn't benefit from many partitions")
                has_warning = True
                warning_msg = (
                    f"Data is only ~{data_size / 1_000_000:.0f}MB. "
                    "Many partitions add overhead without benefit."
                )
        else:
            # Fewer partitions
            benefits.append("Reduced scheduling overhead")
            benefits.append("Fewer shuffle files to manage")
            
            if new_per_partition > 1_000_000_000:  # More than 1GB per partition
                drawbacks.append("Large partitions may cause memory issues")
                has_warning = True
                warning_msg = (
                    f"Each task would process ~{new_per_partition / 1_000_000_000:.1f}GB. "
                    "This may cause OOM errors."
                )
        
        # Determine impact level
        ratio = new / current if current > 0 else float('inf')
        if ratio > 5 or ratio < 0.2:
            impact_level = ImpactLevel.HIGH
        elif ratio > 2 or ratio < 0.5:
            impact_level = ImpactLevel.MEDIUM
        else:
            impact_level = ImpactLevel.LOW
        
        explanation = (
            f"Changing shuffle partitions from {current} to {new} "
            f"will affect how data ({data_size / 1_000_000:.0f}MB) is distributed. "
            f"Each task will process ~{new_per_partition / 1_000_000:.1f}MB."
        )
        
        return ConfigImpact(
            config_name="spark.sql.shuffle.partitions",
            current_value=current_value,
            new_value=new_value,
            impact_level=impact_level,
            explanation=explanation,
            benefits=benefits,
            drawbacks=drawbacks,
            has_warning=has_warning,
            warning_message=warning_msg,
        )
    
    def _simulate_broadcast_threshold(
        self,
        current_value: str,
        new_value: str,
        shape: DataFrameShape,
    ) -> ConfigImpact:
        """Simulate broadcast threshold change."""
        current = self._parse_bytes(current_value)
        new = self._parse_bytes(new_value)
        
        benefits = []
        drawbacks = []
        
        if new > current:
            benefits.append("Larger tables can use broadcast join (faster, no shuffle)")
            drawbacks.append("More memory used per executor for broadcasts")
        else:
            benefits.append("Less memory pressure from broadcasts")
            drawbacks.append("More joins may use shuffle instead of broadcast")
        
        impact_level = ImpactLevel.MEDIUM
        if new > shape.total_size_bytes or current > shape.total_size_bytes:
            impact_level = ImpactLevel.HIGH
        
        explanation = (
            f"Broadcast threshold changes from {current / 1_000_000:.0f}MB to "
            f"{new / 1_000_000:.0f}MB. Tables smaller than this will be broadcast "
            "to all executors during joins."
        )
        
        return ConfigImpact(
            config_name="spark.sql.autoBroadcastJoinThreshold",
            current_value=current_value,
            new_value=new_value,
            impact_level=impact_level,
            explanation=explanation,
            benefits=benefits,
            drawbacks=drawbacks,
        )
    
    def _simulate_adaptive_execution(
        self,
        current_value: str,
        new_value: str,
        shape: DataFrameShape,
    ) -> ConfigImpact:
        """Simulate AQE enable/disable."""
        enabling = new_value.lower() == "true" and current_value.lower() != "true"
        disabling = new_value.lower() != "true" and current_value.lower() == "true"
        
        benefits = []
        drawbacks = []
        
        if enabling:
            benefits.append("Runtime query optimization based on actual data statistics")
            benefits.append("Automatic partition coalescing reduces small file issues")
            benefits.append("Skew handling for unbalanced joins")
            benefits.append("Dynamic join strategy selection")
            drawbacks.append("Small overhead from runtime statistics collection")
        elif disabling:
            benefits.append("More predictable execution plans")
            drawbacks.append("Lose runtime optimizations")
            drawbacks.append("No automatic skew handling")
        
        impact_level = ImpactLevel.HIGH if shape.rows > 1_000_000 else ImpactLevel.MEDIUM
        
        explanation = (
            f"{'Enabling' if enabling else 'Disabling'} Adaptive Query Execution (AQE). "
            "AQE optimizes queries at runtime based on actual data statistics, "
            "which is especially beneficial for large datasets."
        )
        
        return ConfigImpact(
            config_name="spark.sql.adaptive.enabled",
            current_value=current_value,
            new_value=new_value,
            impact_level=impact_level,
            explanation=explanation,
            benefits=benefits,
            drawbacks=drawbacks,
        )
    
    def _simulate_generic(
        self,
        config_name: str,
        current_value: str,
        new_value: str,
        shape: DataFrameShape,
    ) -> ConfigImpact:
        """Generic impact simulation for unknown specifics."""
        config = self.configs.get(config_name)
        description = config.description if config else "Configuration parameter."
        
        return ConfigImpact(
            config_name=config_name,
            current_value=current_value,
            new_value=new_value,
            impact_level=ImpactLevel.LOW,
            explanation=f"Changing {config_name} from {current_value} to {new_value}. {description}",
            benefits=[],
            drawbacks=[],
        )
    
    def _parse_bytes(self, value: str) -> int:
        """Parse a byte value string."""
        value = value.lower().strip()
        
        multipliers = {
            "k": 1024,
            "m": 1024 * 1024,
            "g": 1024 * 1024 * 1024,
            "t": 1024 * 1024 * 1024 * 1024,
        }
        
        for suffix, mult in multipliers.items():
            if value.endswith(suffix):
                return int(float(value[:-1]) * mult)
        
        return int(value)
    
    def analyze_tradeoffs(
        self,
        config_name: str,
        options: list[str],
        shape: DataFrameShape,
    ) -> list[ConfigOption]:
        """Analyze trade-offs between different config values.
        
        Args:
            config_name: Config to analyze.
            options: List of values to compare.
            shape: DataFrame shape for context.
            
        Returns:
            List of ConfigOptions with impact analysis.
        """
        results = []
        
        # Use first option as baseline
        baseline = options[0] if options else "0"
        
        for value in options:
            impact = self.simulate_config_change(
                config_name=config_name,
                current_value=baseline,
                new_value=value,
                shape=shape,
            )
            if impact:
                results.append(ConfigOption(value=value, impact=impact))
        
        return results
    
    def recommend(
        self,
        config_name: str,
        shape: DataFrameShape,
        current_value: Optional[str] = None,
    ) -> Optional[ConfigRecommendation]:
        """Recommend optimal config value based on data shape.
        
        Args:
            config_name: Config to recommend.
            shape: DataFrame shape for context.
            current_value: Current value if known.
            
        Returns:
            ConfigRecommendation with suggested value.
        """
        config = self.get_config(config_name)
        if not config:
            return None
        
        if config_name == "spark.sql.shuffle.partitions":
            return self._recommend_shuffle_partitions(shape, current_value)
        elif config_name == "spark.sql.autoBroadcastJoinThreshold":
            return self._recommend_broadcast_threshold(shape, current_value)
        else:
            return ConfigRecommendation(
                config_name=config_name,
                current_value=current_value,
                recommended_value=config.default_value,
                reasoning="Using Spark default value.",
                confidence="low",
            )
    
    def _recommend_shuffle_partitions(
        self,
        shape: DataFrameShape,
        current_value: Optional[str],
    ) -> ConfigRecommendation:
        """Recommend shuffle partitions based on data size."""
        data_size = shape.total_size_bytes
        
        # Target: ~128MB per partition (good balance)
        target_partition_size = 128 * 1024 * 1024
        recommended = max(1, data_size // target_partition_size)
        
        # Round to nice numbers
        if recommended < 10:
            recommended = max(1, recommended)
        elif recommended < 100:
            recommended = (recommended // 10) * 10
        else:
            recommended = (recommended // 100) * 100
        
        reasoning = (
            f"With {data_size / 1_000_000_000:.1f}GB of data, "
            f"targeting ~128MB per partition suggests {recommended} partitions. "
            f"This balances parallelism with scheduling overhead."
        )
        
        return ConfigRecommendation(
            config_name="spark.sql.shuffle.partitions",
            current_value=current_value,
            recommended_value=str(int(recommended)),
            reasoning=reasoning,
            confidence="medium",
        )
    
    def _recommend_broadcast_threshold(
        self,
        shape: DataFrameShape,
        current_value: Optional[str],
    ) -> ConfigRecommendation:
        """Recommend broadcast threshold."""
        # Default recommendation: 10MB is usually safe
        recommended = "10485760"
        reasoning = (
            "10MB broadcast threshold is a safe default that enables broadcast joins "
            "for small dimension tables without excessive memory pressure."
        )
        
        return ConfigRecommendation(
            config_name="spark.sql.autoBroadcastJoinThreshold",
            current_value=current_value,
            recommended_value=recommended,
            reasoning=reasoning,
            confidence="high",
        )
    
    def explain(self, config_name: str) -> Optional[str]:
        """Get simple explanation of a config.
        
        Args:
            config_name: Config to explain.
            
        Returns:
            Human-readable explanation.
        """
        config = self.get_config(config_name)
        if not config:
            return None
        return config.description
    
    def explain_in_context(
        self,
        config_name: str,
        value: str,
        shape: DataFrameShape,
    ) -> Optional[str]:
        """Explain config in context of specific workload.
        
        Args:
            config_name: Config to explain.
            value: Current value.
            shape: DataFrame shape.
            
        Returns:
            Contextual explanation.
        """
        config = self.get_config(config_name)
        if not config:
            return None
        
        base = config.description
        
        if config_name == "spark.sql.shuffle.partitions":
            partitions = int(value)
            per_partition = shape.total_size_bytes / partitions if partitions > 0 else 0
            base += (
                f"\n\nWith your data ({shape.total_size_bytes / 1_000_000:.0f}MB) and "
                f"{partitions} partitions, each task processes ~{per_partition / 1_000_000:.1f}MB."
            )
        
        return base
    
    def validate_value(self, config_name: str, value: str) -> bool:
        """Validate a config value.
        
        Args:
            config_name: Config to validate.
            value: Value to check.
            
        Returns:
            True if valid, False otherwise.
        """
        config = self.get_config(config_name)
        if not config:
            return True  # Unknown configs pass validation
        
        if config.config_type == ConfigType.NUMERIC:
            try:
                num = int(value)
                if config.min_value and num < int(config.min_value):
                    return False
                if config.max_value and num > int(config.max_value):
                    return False
                return num >= 0 or config.min_value == "-1"
            except ValueError:
                return False
        
        elif config.config_type == ConfigType.BOOLEAN:
            return value.lower() in ("true", "false")
        
        elif config.config_type == ConfigType.BYTES:
            try:
                if value == "-1":
                    return True
                self._parse_bytes(value)
                return True
            except (ValueError, TypeError):
                return False
        
        return True

"""DuckDB service for persistent storage of parsed event logs.

Provides SQL-based querying capabilities for event log data.
"""

from pathlib import Path
from typing import Optional

import duckdb

from app.models.spark_events import ParsedEventLog


class DuckDBService:
    """Service for storing and querying event logs using DuckDB."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        """Initialize DuckDB connection.

        Args:
            db_path: Path to the database file. Uses in-memory DB if None.
        """
        if db_path:
            self.conn = duckdb.connect(str(db_path))
        else:
            self.conn = duckdb.connect(":memory:")
        
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        """Create database tables for event log data."""
        # Applications table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id VARCHAR PRIMARY KEY,
                name VARCHAR,
                spark_version VARCHAR,
                start_time BIGINT,
                end_time BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Jobs table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id INTEGER,
                app_id VARCHAR,
                submission_time BIGINT,
                completion_time BIGINT,
                status VARCHAR,
                num_stages INTEGER,
                PRIMARY KEY (app_id, job_id),
                FOREIGN KEY (app_id) REFERENCES applications(id)
            )
        """)

        # Stages table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS stages (
                stage_id INTEGER,
                app_id VARCHAR,
                attempt_id INTEGER,
                name VARCHAR,
                num_tasks INTEGER,
                status VARCHAR,
                submission_time BIGINT,
                completion_time BIGINT,
                input_bytes BIGINT DEFAULT 0,
                output_bytes BIGINT DEFAULT 0,
                shuffle_read_bytes BIGINT DEFAULT 0,
                shuffle_write_bytes BIGINT DEFAULT 0,
                spill_bytes BIGINT DEFAULT 0,
                PRIMARY KEY (app_id, stage_id, attempt_id),
                FOREIGN KEY (app_id) REFERENCES applications(id)
            )
        """)

        # Tasks table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id BIGINT,
                app_id VARCHAR,
                stage_id INTEGER,
                attempt_id INTEGER,
                executor_id VARCHAR,
                host VARCHAR,
                status VARCHAR,
                launch_time BIGINT,
                finish_time BIGINT,
                duration_ms BIGINT,
                input_bytes BIGINT DEFAULT 0,
                output_bytes BIGINT DEFAULT 0,
                shuffle_read_bytes BIGINT DEFAULT 0,
                shuffle_write_bytes BIGINT DEFAULT 0,
                spill_bytes BIGINT DEFAULT 0,
                gc_time_ms BIGINT DEFAULT 0,
                PRIMARY KEY (app_id, task_id, attempt_id),
                FOREIGN KEY (app_id) REFERENCES applications(id)
            )
        """)

        # Stage relationships (parent/child)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS stage_dependencies (
                app_id VARCHAR,
                stage_id INTEGER,
                parent_stage_id INTEGER,
                PRIMARY KEY (app_id, stage_id, parent_stage_id),
                FOREIGN KEY (app_id) REFERENCES applications(id)
            )
        """)

    def store_event_log(self, parsed_log: ParsedEventLog) -> str:
        """Store a parsed event log in the database.

        Args:
            parsed_log: The parsed event log data.

        Returns:
            The application ID of the stored log.

        Raises:
            ValueError: If no application ID is present in the log.
        """
        if not parsed_log.application_id:
            raise ValueError("Cannot store event log without application ID")

        app_id = parsed_log.application_id

        # Store application info
        self.conn.execute("""
            INSERT OR REPLACE INTO applications (id, name, spark_version, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
        """, [
            app_id,
            parsed_log.application_name,
            parsed_log.spark_version,
            parsed_log.start_time,
            parsed_log.end_time,
        ])

        # Store jobs
        for job in parsed_log.jobs:
            self.conn.execute("""
                INSERT OR REPLACE INTO jobs (job_id, app_id, submission_time, completion_time, status, num_stages)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [
                job.job_id,
                app_id,
                job.submission_time,
                job.completion_time,
                job.status,
                len(job.stage_ids),
            ])

        # Store stages
        for stage in parsed_log.stages:
            self.conn.execute("""
                INSERT OR REPLACE INTO stages (
                    stage_id, app_id, attempt_id, name, num_tasks, status,
                    submission_time, completion_time,
                    input_bytes, output_bytes, shuffle_read_bytes, shuffle_write_bytes, spill_bytes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                stage.stage_id,
                app_id,
                stage.attempt_id,
                stage.name,
                stage.num_tasks,
                stage.status,
                stage.submission_time,
                stage.completion_time,
                stage.input_bytes,
                stage.output_bytes,
                stage.shuffle_read_bytes,
                stage.shuffle_write_bytes,
                stage.spill_bytes,
            ])

            # Store stage dependencies
            for parent_id in stage.parent_ids:
                self.conn.execute("""
                    INSERT OR IGNORE INTO stage_dependencies (app_id, stage_id, parent_stage_id)
                    VALUES (?, ?, ?)
                """, [app_id, stage.stage_id, parent_id])

        # Store tasks
        for task in parsed_log.tasks:
            self.conn.execute("""
                INSERT OR REPLACE INTO tasks (
                    task_id, app_id, stage_id, attempt_id, executor_id, host, status,
                    launch_time, finish_time, duration_ms,
                    input_bytes, output_bytes, shuffle_read_bytes, shuffle_write_bytes, spill_bytes, gc_time_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                task.task_id,
                app_id,
                task.stage_id,
                task.attempt,  # Note: field is 'attempt' not 'attempt_id' in model
                task.executor_id,
                task.host,
                task.status,
                task.launch_time,
                task.finish_time,
                task.duration_ms,
                task.input_bytes,
                task.output_bytes,
                task.shuffle_read_bytes,
                task.shuffle_write_bytes,
                task.spill_bytes,
                0,  # gc_time_ms not in model, default to 0
            ])

        return app_id

    def get_application(self, app_id: str) -> Optional[dict]:
        """Retrieve application info by ID."""
        result = self.conn.execute(
            "SELECT * FROM applications WHERE id = ?", [app_id]
        ).fetchone()
        
        if not result:
            return None

        columns = ["id", "name", "spark_version", "start_time", "end_time", "created_at"]
        return dict(zip(columns, result))

    def get_jobs(self, app_id: str) -> list[dict]:
        """Retrieve all jobs for an application."""
        result = self.conn.execute(
            "SELECT * FROM jobs WHERE app_id = ? ORDER BY job_id", [app_id]
        ).fetchall()
        
        columns = ["job_id", "app_id", "submission_time", "completion_time", "status", "num_stages"]
        return [dict(zip(columns, row)) for row in result]

    def get_stages(self, app_id: str) -> list[dict]:
        """Retrieve all stages for an application."""
        result = self.conn.execute(
            "SELECT * FROM stages WHERE app_id = ? ORDER BY stage_id, attempt_id", [app_id]
        ).fetchall()
        
        columns = [
            "stage_id", "app_id", "attempt_id", "name", "num_tasks", "status",
            "submission_time", "completion_time",
            "input_bytes", "output_bytes", "shuffle_read_bytes", "shuffle_write_bytes", "spill_bytes"
        ]
        return [dict(zip(columns, row)) for row in result]

    def get_tasks(self, app_id: str, stage_id: Optional[int] = None) -> list[dict]:
        """Retrieve tasks for an application, optionally filtered by stage."""
        if stage_id is not None:
            result = self.conn.execute(
                "SELECT * FROM tasks WHERE app_id = ? AND stage_id = ? ORDER BY task_id",
                [app_id, stage_id]
            ).fetchall()
        else:
            result = self.conn.execute(
                "SELECT * FROM tasks WHERE app_id = ? ORDER BY task_id", [app_id]
            ).fetchall()
        
        columns = [
            "task_id", "app_id", "stage_id", "attempt_id", "executor_id", "host", "status",
            "launch_time", "finish_time", "duration_ms",
            "input_bytes", "output_bytes", "shuffle_read_bytes", "shuffle_write_bytes", "spill_bytes", "gc_time_ms"
        ]
        return [dict(zip(columns, row)) for row in result]

    def query_stage_shuffle_stats(self, app_id: str) -> list[dict]:
        """Get shuffle statistics per stage for an application."""
        result = self.conn.execute("""
            SELECT 
                stage_id,
                name,
                num_tasks,
                shuffle_read_bytes,
                shuffle_write_bytes,
                CASE WHEN shuffle_write_bytes > 0 THEN 'shuffle_producer' ELSE '' END as role,
                CASE WHEN shuffle_read_bytes > 0 THEN 'shuffle_consumer' ELSE '' END as consumer_role
            FROM stages
            WHERE app_id = ?
            ORDER BY stage_id
        """, [app_id]).fetchall()
        
        columns = ["stage_id", "name", "num_tasks", "shuffle_read_bytes", "shuffle_write_bytes", "role", "consumer_role"]
        return [dict(zip(columns, row)) for row in result]

    def query_task_skew(self, app_id: str, stage_id: int) -> dict:
        """Analyze task duration skew for a stage."""
        result = self.conn.execute("""
            SELECT 
                COUNT(*) as task_count,
                AVG(duration_ms) as avg_duration,
                MAX(duration_ms) as max_duration,
                MIN(duration_ms) as min_duration,
                STDDEV(duration_ms) as stddev_duration,
                MAX(duration_ms) / NULLIF(AVG(duration_ms), 0) as skew_ratio
            FROM tasks
            WHERE app_id = ? AND stage_id = ?
        """, [app_id, stage_id]).fetchone()
        
        columns = ["task_count", "avg_duration", "max_duration", "min_duration", "stddev_duration", "skew_ratio"]
        return dict(zip(columns, result)) if result else {}

    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()

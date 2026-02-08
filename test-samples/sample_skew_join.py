# sample_skew_join.py
# A PySpark script demonstrating a common skew + shuffle problem

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum as spark_sum, avg, broadcast, explode, lit

spark = SparkSession.builder \
    .appName("SkewJoinExample") \
    .config("spark.sql.shuffle.partitions", "200") \
    .config("spark.sql.adaptive.enabled", "true") \
    .getOrCreate()

# Read large transaction table (500M rows, skewed on merchant_id)
transactions = spark.read.parquet("s3://warehouse/transactions/")

# Read merchant dimension table (50K rows)
merchants = spark.read.parquet("s3://warehouse/merchants/")

# This join will cause massive skew - top 10 merchants have 80% of transactions
enriched = transactions.join(merchants, "merchant_id", "inner")

# GroupBy on skewed column causes straggler tasks
daily_revenue = enriched \
    .groupBy("merchant_id", "transaction_date") \
    .agg(
        count("*").alias("num_transactions"),
        spark_sum("amount").alias("total_revenue"),
        avg("amount").alias("avg_transaction"),
    )

# Repartition before write (unnecessary - Spark handles this)
daily_revenue.repartition(100) \
    .write \
    .mode("overwrite") \
    .partitionBy("transaction_date") \
    .parquet("s3://warehouse/daily_revenue/")

# CloudWatch Synthetics Canaries

# Visual Defacement Check - Every 5 minutes
resource "aws_synthetics_canary" "visual_defacement_check" {
  name                 = "${var.app_name}-visual-defacement-check"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts.bucket}/canary-artifacts"
  execution_role_arn   = aws_iam_role.synthetics_role.arn
  handler              = "visual-defacement-check.handler"
  zip_file            = "aws-config/cloudwatch-synthetics/visual-defacement-check.js"
  runtime_version     = "syn-nodejs-puppeteer-6.2"
  
  schedule {
    expression = "rate(5 minutes)"
  }
  
  run_config {
    timeout_in_seconds    = 60
    memory_in_mb         = 960
    active_tracing       = true
  }
  
  failure_retention_period = 30
  success_retention_period = 30
  
  tags = {
    Name = "${var.app_name}-visual-defacement-check"
    Type = "security"
  }
}

# Content Integrity Check - Every 10 minutes  
resource "aws_synthetics_canary" "content_integrity_check" {
  name                 = "${var.app_name}-content-integrity-check"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts.bucket}/canary-artifacts"
  execution_role_arn   = aws_iam_role.synthetics_role.arn
  handler              = "content-integrity-check.handler"
  zip_file            = "aws-config/cloudwatch-synthetics/content-integrity-check.js"
  runtime_version     = "syn-nodejs-puppeteer-6.2"
  
  schedule {
    expression = "rate(10 minutes)"
  }
  
  run_config {
    timeout_in_seconds    = 60
    memory_in_mb         = 960
    active_tracing       = true
  }
  
  failure_retention_period = 30
  success_retention_period = 30
  
  tags = {
    Name = "${var.app_name}-content-integrity-check"
    Type = "security"
  }
}

# API Health Check - Every 5 minutes
resource "aws_synthetics_canary" "api_health_check" {
  name                 = "${var.app_name}-api-health-check"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts.bucket}/canary-artifacts"
  execution_role_arn   = aws_iam_role.synthetics_role.arn
  handler              = "api-health-check.handler"
  zip_file            = "aws-config/cloudwatch-synthetics/api-health-check.js"
  runtime_version     = "syn-nodejs-puppeteer-6.2"
  
  schedule {
    expression = "rate(5 minutes)"
  }
  
  run_config {
    timeout_in_seconds    = 30
    memory_in_mb         = 960
    active_tracing       = true
  }
  
  failure_retention_period = 30
  success_retention_period = 30
  
  tags = {
    Name = "${var.app_name}-api-health-check"
    Type = "monitoring"
  }
}

# Performance Baseline - Every hour
resource "aws_synthetics_canary" "performance_baseline" {
  name                 = "${var.app_name}-performance-baseline"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts.bucket}/canary-artifacts"
  execution_role_arn   = aws_iam_role.synthetics_role.arn
  handler              = "performance-baseline.handler"
  zip_file            = "aws-config/cloudwatch-synthetics/performance-baseline.js"
  runtime_version     = "syn-nodejs-puppeteer-6.2"
  
  schedule {
    expression = "rate(60 minutes)"
  }
  
  run_config {
    timeout_in_seconds    = 60
    memory_in_mb         = 960
    active_tracing       = true
  }
  
  failure_retention_period = 30
  success_retention_period = 30
  
  tags = {
    Name = "${var.app_name}-performance-baseline"
    Type = "performance"
  }
}

# CloudWatch Alarms for Synthetics
resource "aws_cloudwatch_metric_alarm" "visual_defacement_alarm" {
  alarm_name          = "${var.app_name}-visual-defacement-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "Visual defacement check is failing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    CanaryName = aws_synthetics_canary.visual_defacement_check.name
  }
}

resource "aws_cloudwatch_metric_alarm" "content_integrity_alarm" {
  alarm_name          = "${var.app_name}-content-integrity-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = "600"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "Content integrity check is failing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    CanaryName = aws_synthetics_canary.content_integrity_check.name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_health_alarm" {
  alarm_name          = "${var.app_name}-api-health-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "API health check is failing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    CanaryName = aws_synthetics_canary.api_health_check.name
  }
}

resource "aws_cloudwatch_metric_alarm" "performance_alarm" {
  alarm_name          = "${var.app_name}-performance-degraded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  period              = "3600"
  statistic           = "Average"
  threshold           = "10000"  # 10 seconds
  alarm_description   = "Website performance is degraded"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    CanaryName = aws_synthetics_canary.performance_baseline.name
  }
}
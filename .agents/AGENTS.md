# Project Rules - Courses Management

## Overview
This repository manages course curricula, paths, and modules inside `sheet.xlsx` (specifically in the sheet named `Danh sách khóa học EPM V5`), and provides a web application to manage courses, track user learning progress, and display analytical dashboards.

## Rules for Updating Sheet Data

### 1. Data Entry from Images
- When the user provides a **Course Name** and **Images/Screenshots**, extract the modules, paths, and durations from the screenshots.
- Match and update the corresponding course rows inside the `sheet.xlsx` file.

### 2. Hierarchy Structure
- Columns follow the layout:
  - **Plan** (Col A)
  - **Course Name** (Col B)
  - **Path** (Col C)
  - **Module Name** (Col D)
  - **Duration** (Col E)
  - **Duration (Minutes)** (Col F)
  - **Queue** (Col G)
  - **% of Total** (Col H)
- If a course has a sub-level hierarchy, use the **Path** column. If there is no Path hierarchy (only Course -> Modules), leave the **Path** column blank.

### 3. Inserting Rows
- When a Course or Path contains multiple modules, keep the first module on the existing row, and insert new rows immediately below it for the remaining modules.
- Ensure newly inserted rows copy the correct `Plan`, `Course Name`, and `Path` values.

### 4. Updating formulas (`% of Total`)
- Whenever rows are inserted or columns are modified, recalculate the formula in column H (`% of Total`) for all rows from Row 2 to `max_row`.
- The formula must be formatted as:
  `=IF(G{row}, TEXT(F{row}/SUMIF($G$2:$G${max_row}, TRUE, $F$2:$F${max_row}), "0.00%"), "0.00%")`
  where `{row}` is the current row index, and `{max_row}` is the final row of data.

## Features & Authorization Specification

### 1. Course Management
- Automatically parse course structure input and populate it into the database (`sheet.xlsx` / SQLite).
- Ensure the hierarchy is correctly mapped into rows and columns.

### 2. Progress Tracking
- Normal users can update progress (Status, Progress %, Actual Completion Date).
- Progress statuses are compared with the Planned Completion Date to calculate tracking speed.

### 3. Color-Coded Dashboard Tracking
- **Light Green (On-track / Đúng tiến độ)**: Status is `In Progress` or `Not Started`, and current date is <= Planned Completion Date.
- **Dark Green (Fast / Học nhanh)**: Status is `Completed` and Actual Completion Date <= Planned Completion Date.
- **Yellow (Slow / Chậm)**: Status is `Completed` and Actual Completion Date > Planned Completion Date, OR Status is `In Progress`/`Not Started` and current date > Planned Completion Date (by <= 7 days).
- **Red (Too slow / Quá chậm)**: Status is `In Progress`/`Not Started` and current date > Planned Completion Date + 7 days.

### 4. Role Permissions
- **Employee**: Can view only their own progress and update progress/dates.
- **Manager / Power User**: Can view aggregate progress of all employees in a single dashboard screen, manage employees, and manage/edit the course catalog.

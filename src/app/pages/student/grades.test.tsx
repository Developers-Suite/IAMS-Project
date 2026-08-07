import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentGradesPage } from "./grades";
import { render, screen, waitFor } from "@testing-library/react";
import { apiClient } from "../../lib/api-client";
import React from "react";

// Mock the apiClient
vi.mock("../../lib/api-client", () => {
  return {
    apiClient: {
      getDashboard: vi.fn(),
      getGrade: vi.fn(),
    },
  };
});

describe("StudentGradesPage UI Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should display non-published complete fields for completed internship", async () => {
    // 1. Mock student dashboard response with completed internship
    const mockDashRes = {
      success: true,
      data: {
        active_internship: {
          id: 123,
          status: "completed",
          company: {
            name: "Acme Corp",
          },
        },
      },
    };
    (apiClient.getDashboard as any).mockResolvedValue(mockDashRes);

    // 2. Mock grades with draft status
    const mockGradeRes = {
      success: true,
      data: {
        grade: {
          id: 456,
          status: "draft",
          industrial_assessment_score: 90,
          site_visitation_score: 85,
          report_score: 80,
          presentation_score: 95,
          total_score: 87.5,
          letter_grade: "B+",
          gpa: 3.5,
          industrial_assessment_weighted: 20,
          site_visitation_weighted: 30,
          report_weighted: 30,
          presentation_weighted: 20,
        },
      },
    };
    (apiClient.getGrade as any).mockResolvedValue(mockGradeRes);

    render(<StudentGradesPage />);

    // Wait for the loading skeleton to disappear and display fields
    await waitFor(() => {
      expect(screen.queryByText("Evaluation in Progress")).toBeNull();
    });

    // It should render the Grade Under Review banner
    expect(screen.getByText("Grade Under Review")).toBeInTheDocument();
    expect(screen.getByText(/Your evaluations are complete. Your DLO is reviewing/i)).toBeInTheDocument();

    // The GPA 3.5 should not be in the document
    expect(screen.queryByText("GPA: 3.5 / 4.0")).toBeNull();
    // The total score 87.5% should not be in the document
    expect(screen.queryByText("87.5%")).toBeNull();

    // But fields like Score Breakdown and Component Rows should still be rendered (as Pending)
    expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Industrial Assessment")).toBeInTheDocument();
    expect(screen.getByText("Site Visitation")).toBeInTheDocument();
  });

  it("should display actual scores if internship is complete and grades are published", async () => {
    // 1. Mock student dashboard response with completed internship
    const mockDashRes = {
      success: true,
      data: {
        active_internship: {
          id: 123,
          status: "completed",
          company: {
            name: "Acme Corp",
          },
        },
      },
    };
    (apiClient.getDashboard as any).mockResolvedValue(mockDashRes);

    // 2. Mock grades with published status
    const mockGradeRes = {
      success: true,
      data: {
        grade: {
          id: 456,
          status: "published",
          industrial_assessment_score: 90,
          site_visitation_score: 85,
          report_score: 80,
          presentation_score: 95,
          total_score: 87.5,
          letter_grade: "B+",
          gpa: 3.5,
          industrial_assessment_weighted: 20,
          site_visitation_weighted: 30,
          report_weighted: 30,
          presentation_weighted: 20,
        },
      },
    };
    (apiClient.getGrade as any).mockResolvedValue(mockGradeRes);

    render(<StudentGradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
    });

    // Score breakdown and published banner should contain the actual letter grade, scores and percentages
    expect(screen.getAllByText("B+").length).toBe(2); // One in grade banner, one in legend
    expect(screen.getAllByText("87.5%").length).toBe(2); // One in final grade banner, one in component total
    expect(screen.getByText("GPA: 3.5 / 4.0")).toBeInTheDocument();
  });
});

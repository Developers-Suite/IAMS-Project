import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentHistoryPage } from "./history";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { apiClient } from "../../lib/api-client";
import React from "react";

// Mock the apiClient
vi.mock("../../lib/api-client", () => {
  return {
    apiClient: {
      getInternships: vi.fn(),
      getGrade: vi.fn(),
      getIndustrialAssessments: vi.fn(),
      getInternshipLogbooks: vi.fn(),
      getInternshipAttendance: vi.fn(),
    },
  };
});

// Mock useAppContext
vi.mock("../../lib/context", () => {
  return {
    useAppContext: () => ({
      user: { id: "student-1", role: "student" },
    }),
  };
});

describe("StudentHistoryPage Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should render internships list and handle expanding details", async () => {
    const mockInternshipsRes = {
      success: true,
      data: [
        {
          id: 101,
          status: "completed",
          created_at: "2026-07-08T00:00:00.000Z",
          start_date: "2026-07-08",
          end_date: "2026-10-08",
          company: { name: "MTN Ghana" },
          industry_supervisor: { name: "John Doe" },
        },
      ],
    };
    (apiClient.getInternships as any).mockResolvedValue(mockInternshipsRes);

    render(<StudentHistoryPage />);

    // Wait for MTN Ghana to appear
    await waitFor(() => {
      expect(screen.getByText("MTN Ghana")).toBeInTheDocument();
    });

    // Expand details
    const viewDetailsBtn = screen.getByText("View Details");
    fireEvent.click(viewDetailsBtn);

    // Should show overview by default
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("08/07/2026")).toBeInTheDocument();
  });

  it("should display published grades on the Grades tab", async () => {
    const mockInternshipsRes = {
      success: true,
      data: [
        {
          id: 101,
          status: "completed",
          created_at: "2026-07-08T00:00:00.000Z",
          start_date: "2026-07-08",
          end_date: "2026-10-08",
          company: { name: "MTN Ghana" },
        },
      ],
    };
    (apiClient.getInternships as any).mockResolvedValue(mockInternshipsRes);

    const mockGradeRes = {
      success: true,
      data: {
        id: 201,
        status: "published",
        letter_grade: "A",
        total_score: 91.5,
        gpa: 4.0,
        industrial_assessment_score: 95.0,
        site_visitation_score: 88.0,
        report_score: 90.0,
        presentation_score: 93.0,
        comments: "Excellent work done!",
      },
    };
    (apiClient.getGrade as any).mockResolvedValue(mockGradeRes);

    render(<StudentHistoryPage />);

    // Expand MTN Ghana
    await waitFor(() => {
      expect(screen.getByText("MTN Ghana")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("View Details"));

    // Switch to Grades Tab
    const gradesTabBtn = screen.getByText("Grades");
    fireEvent.click(gradesTabBtn);

    // Wait for Grade elements
    await waitFor(() => {
      expect(screen.getByText("Final Grade")).toBeInTheDocument();
    });

    expect(screen.getByText("A (91.5%)")).toBeInTheDocument();
    expect(screen.getByText("GPA: 4.0 / 4.0")).toBeInTheDocument();
    expect(screen.getByText("Industrial Assessment")).toBeInTheDocument();
    expect(screen.getByText("95.0 / 100")).toBeInTheDocument();
    expect(screen.getByText("Site Visitation")).toBeInTheDocument();
    expect(screen.getByText("88.0 / 100")).toBeInTheDocument();
    expect(screen.getByText("Report Score")).toBeInTheDocument();
    expect(screen.getByText("90.0 / 100")).toBeInTheDocument();
    expect(screen.getByText("Presentation Score")).toBeInTheDocument();
    expect(screen.getByText("93.0 / 100")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Excellent work done!")).toBeInTheDocument();
  });

  it("should show Grade Under Review for draft / non-published grades", async () => {
    const mockInternshipsRes = {
      success: true,
      data: [
        {
          id: 101,
          status: "completed",
          created_at: "2026-07-08T00:00:00.000Z",
          start_date: "2026-07-08",
          end_date: "2026-10-08",
          company: { name: "MTN Ghana" },
        },
      ],
    };
    (apiClient.getInternships as any).mockResolvedValue(mockInternshipsRes);

    const mockGradeRes = {
      success: true,
      data: {
        id: 201,
        status: "draft",
        letter_grade: "B+",
        total_score: 78.5,
        gpa: 3.3,
        industrial_assessment_score: 80.0,
      },
    };
    (apiClient.getGrade as any).mockResolvedValue(mockGradeRes);

    render(<StudentHistoryPage />);

    // Expand MTN Ghana
    await waitFor(() => {
      expect(screen.getByText("MTN Ghana")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("View Details"));

    // Switch to Grades Tab
    const gradesTabBtn = screen.getByText("Grades");
    fireEvent.click(gradesTabBtn);

    // Wait for the tab loading
    await waitFor(() => {
      expect(screen.getByText("Grade Under Review")).toBeInTheDocument();
    });

    // Score and letter grade should not be displayed
    expect(screen.queryByText("B+ (78.5%)")).toBeNull();
  });

  it("should dynamically calculate and render Evaluation tab with section averages", async () => {
    const mockInternshipsRes = {
      success: true,
      data: [
        {
          id: 101,
          status: "completed",
          created_at: "2026-07-08T00:00:00.000Z",
          start_date: "2026-07-08",
          end_date: "2026-10-08",
          company: { name: "MTN Ghana" },
        },
      ],
    };
    (apiClient.getInternships as any).mockResolvedValue(mockInternshipsRes);

    // Return null grade first, but mock direct getIndustrialAssessments to return the assessment
    (apiClient.getGrade as any).mockResolvedValue({ success: false });

    const mockAssessmentsRes = {
      success: true,
      data: [
        {
          id: 301,
          internship_id: 101,
          general_comments: "Supervisor comments here",
          tech_understanding_concepts: 4,
          tech_application_knowledge: 5,
          tech_problem_solving: 4,
          tech_practical_skills: 4,
          tech_innovation: 4, // Section A Average = (4+5+4+4+4)/5 = 4.2
          prof_communication: 5,
          prof_teamwork: 4,
          prof_initiative: 5,
          prof_time_management: 5,
          prof_adaptability: 4, // Section B Average = (5+4+5+5+4)/5 = 4.6
          eth_punctuality: 5,
          eth_reliability: 5,
          eth_responsibility: 5,
          eth_professionalism: 5, // Section C Average = 5.0
          overall_quality: 4,
          overall_quantity: 4,
          overall_improvement: 4,
          overall_recommendation: 4, // Section D Average = 4.0
        },
      ],
    };
    (apiClient.getIndustrialAssessments as any).mockResolvedValue(mockAssessmentsRes);

    render(<StudentHistoryPage />);

    // Expand MTN Ghana
    await waitFor(() => {
      expect(screen.getByText("MTN Ghana")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("View Details"));

    // Switch to Evaluation Tab (labeled "Evaluation" with documents key)
    const evaluationTabBtn = screen.getByText("Evaluation");
    fireEvent.click(evaluationTabBtn);

    // Wait for dynamic calculations to render
    await waitFor(() => {
      expect(screen.getByText("Supervisor Comments")).toBeInTheDocument();
    });

    expect(screen.getByText("Supervisor comments here")).toBeInTheDocument();
    expect(screen.getByText("Technical Skills (Section A)")).toBeInTheDocument();
    expect(screen.getByText("4.2/5")).toBeInTheDocument();
    expect(screen.getByText("Professional Skills (Section B)")).toBeInTheDocument();
    expect(screen.getByText("4.6/5")).toBeInTheDocument();
    expect(screen.getByText("Ethics & Conduct (Section C)")).toBeInTheDocument();
    expect(screen.getByText("5.0/5")).toBeInTheDocument();
    expect(screen.getByText("Overall Performance (Section D)")).toBeInTheDocument();
    expect(screen.getByText("4.0/5")).toBeInTheDocument();

    // Total average = (21 + 23 + 20 + 16) / 18 = 80 / 18 = 4.44 => 4.4
    expect(screen.getByText("4.4/5")).toBeInTheDocument();
  });
});

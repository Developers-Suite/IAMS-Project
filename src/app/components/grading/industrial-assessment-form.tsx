import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { CheckCircle2 } from "lucide-react";
import { INDUSTRIAL_CRITERIA, RATING_LABELS, SECTION_LABELS } from "../../lib/constants";
import { calculateIndustrialScore } from "../../services/grading-service";
import type { CriterionRating, SectionWeights } from "../../types/grading";

interface Props {
  sectionWeights: SectionWeights;
  initialRatings?: Record<string, CriterionRating>;
  initialComments?: string;
  onSubmit: (ratings: Record<string, CriterionRating>, comments: string) => void;
  submitting?: boolean;
  readOnly?: boolean;
}

export function IndustrialAssessmentForm({
  sectionWeights, initialRatings = {}, initialComments = "", onSubmit, submitting, readOnly = false,
}: Props) {
  const [ratings, setRatings] = useState<Record<string, CriterionRating>>(initialRatings);
  const [comments, setComments] = useState(initialComments);

  const liveScore = useMemo(
    () => calculateIndustrialScore(ratings, sectionWeights),
    [ratings, sectionWeights]
  );

  const allRated = INDUSTRIAL_CRITERIA.every((c) => ratings[c.key]);
  const sections: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-sm font-medium dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Final Industrial Assessment has been submitted and locked.
        </div>
      )}

      <Card className="p-4 bg-[#E3F3FF] border-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Live Computed Score</div>
            <div className="text-2xl text-[#0B5ED7]">{liveScore.toFixed(2)} / 100</div>
          </div>
          <div className="text-sm text-gray-700">
            {INDUSTRIAL_CRITERIA.filter((c) => ratings[c.key]).length} / {INDUSTRIAL_CRITERIA.length} rated
          </div>
        </div>
      </Card>

      {sections.map((sec) => (
        <div key={sec}>
          <div className="flex items-center justify-between mb-3">
            <Label>Section {sec} — {SECTION_LABELS[sec]}</Label>
            <span className="text-sm text-gray-600">Weight: {(sectionWeights as any)[sec.toLowerCase()]}%</span>
          </div>
          <div className="space-y-2">
            {INDUSTRIAL_CRITERIA.filter((c) => c.section === sec).map((c) => (
              <Card key={c.key} className="p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1a1a2e]">
                      {c.label.includes(".") ? c.label.split(".").slice(1).join(".").trim() : c.label}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = ratings[c.key] === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={readOnly}
                          onClick={() => !readOnly && setRatings({ ...ratings, [c.key]: n as CriterionRating })}
                          title={RATING_LABELS[n as 1 | 2 | 3 | 4 | 5]}
                          className={`w-9 h-9 rounded-md border text-sm transition ${
                            active
                              ? "bg-[#0B5ED7] text-white border-[#0B5ED7]"
                              : "border-gray-300 text-gray-700 hover:border-[#0B5ED7]"
                          } ${readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <div>
        <Label htmlFor="ind-comments">Overall Comments</Label>
        <Textarea
          id="ind-comments"
          value={comments}
          disabled={readOnly}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          placeholder={readOnly ? "No comments provided" : "Optional summary of the student's performance during the attachment..."}
          className={`mt-1 ${readOnly ? "bg-muted/40 cursor-not-allowed" : ""}`}
        />
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!allRated || submitting || readOnly}
          onClick={() => !readOnly && onSubmit(ratings, comments)}
          className={
            readOnly
              ? "bg-gray-400 text-white cursor-not-allowed hover:bg-gray-400 opacity-60 font-semibold"
              : "bg-[#0B5ED7] hover:bg-[#0a52bd]"
          }
        >
          {submitting ? "Submitting…" : readOnly ? "Final Assessment Submitted" : "Submit Assessment"}
        </Button>
      </div>
      {!allRated && !readOnly && (
        <p className="text-sm text-gray-600 text-right">All {INDUSTRIAL_CRITERIA.length} criteria must be rated before submitting.</p>
      )}
    </div>
  );
}

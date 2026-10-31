"use client";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import api from "../../lib/axios";
import ReportCardDownload from "../../components/ReportCardDownload";
import RankCard from "../../components/results/RankCard";
import MarksTable from "../../components/results/MarksTable";

export default function ResultsView({ studentId }: { studentId: string }) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/exams/student-results/${studentId}`);
        setResults(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Results not available yet");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const isLetter = results.gradingSystem === "LETTER";

  return (
    <div className="space-y-3">
      {results.position && results.classSize > 0 && (
        <RankCard
          position={results.position}
          classSize={results.classSize}
          percentile={results.percentile}
          isLetter={isLetter}
          averageMark={results.averageMark}
          overallGrade={results.overallGrade}
          totalPoints={results.totalPoints}
          subjectsCounted={results.subjectsCounted}
        />
      )}

      <MarksTable
        examName={results.examPeriod.name}
        term={results.examPeriod.term}
        academicYear={results.examPeriod.academicYear}
        results={results.results}
        isLetter={isLetter}
        totalMarks={results.totalMarks}
        totalPoints={results.totalPoints}
        subjectsCounted={results.subjectsCounted}
        averageMark={results.averageMark}
        overallGrade={results.overallGrade}
      />

      {/*  DOWNLOAD REPORT CARD BUTTON */}
      <ReportCardDownload
        studentId={studentId}
        term={results.examPeriod.term}
        academicYear={results.examPeriod.academicYear}
      />
    </div>
  );
}

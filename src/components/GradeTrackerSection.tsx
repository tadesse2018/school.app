import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { applyOklchCleanup } from '../lib/pdfUtils';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  GraduationCap, 
  TrendingUp, 
  Users, 
  Award, 
  CheckCircle2, 
  XCircle,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Smile,
  ShieldCheck,
  Edit2,
  Save,
  Lock,
  Unlock,
  FileText,
  Trash2,
  AlertTriangle,
  Search,
  PlusCircle,
  Check,
  List,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { Student, Grade, Teacher } from '../schoolData';
import { playInteractiveSound } from './AudioEngine';
import { PerformanceDashboard } from './PerformanceDashboard';
import { SimulatedEmailOutbox } from './SimulatedEmailOutbox';

const ETHIOPIAN_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ህዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

export function getFormattedDualCalendarDate(date: Date): { gc: string; ec: string } {
  // 1. Gregorian Calendar formatting
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const gcEng = date.toLocaleDateString('en-US', options);

  // 2. Ethiopian Calendar conversion
  const Y = date.getFullYear();

  // Determine if the *current* Gregorian year's upcoming September starts a leap year (Pagume has 6 days in year preceding GC leap year)
  const isLeapPreceding = ((Y + 1) % 4 === 0 && (Y + 1) % 100 !== 0) || ((Y + 1) % 400 === 0);
  const newYearDay = isLeapPreceding ? 12 : 11;
  const newYearDateThisYear = new Date(Y, 8, newYearDay); // Sept is 8

  let ethYear: number;
  let startOfEthYear: Date;

  if (date >= newYearDateThisYear) {
    ethYear = Y - 7;
    startOfEthYear = newYearDateThisYear;
  } else {
    ethYear = Y - 8;
    const prevY = Y - 1;
    const isPrevLeapPreceding = ((prevY + 1) % 4 === 0 && (prevY + 1) % 100 !== 0) || ((prevY + 1) % 400 === 0);
    const prevNewYearDay = isPrevLeapPreceding ? 12 : 11;
    startOfEthYear = new Date(prevY, 8, prevNewYearDay);
  }

  // Calculate day difference safely using UTC timestamps
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcStart = Date.UTC(startOfEthYear.getFullYear(), startOfEthYear.getMonth(), startOfEthYear.getDate());
  const diffDays = Math.floor((utcDate - utcStart) / (1000 * 60 * 60 * 24));

  const ethMonthIndex = Math.floor(diffDays / 30);
  const ethMonth = ETHIOPIAN_MONTHS[ethMonthIndex] || 'መስከረም';
  const ethDay = (diffDays % 30) + 1;

  const ecFormatted = `${ethMonth} ${ethDay} ቀን ${ethYear} ዓ.ም`;

  return {
    gc: gcEng,
    ec: ecFormatted
  };
}

interface GradeTrackerSectionProps {
  students: Student[];
  grades: Grade[];
  teachers?: Teacher[];
  currentUserEmail?: string;
  schoolConfig?: {
    nameAmh: string;
    nameEng: string;
    mottoAmh: string;
    mottoEng: string;
    phone: string;
    email: string;
    address: string;
    logoType: 'graduation' | 'book' | 'shield' | 'award';
    themeColor: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';
    subjects: string[];
    evaluationMode?: 'quarter' | 'semester';
  };
  currentUserRole?: 'principal' | 'teacher' | 'parent';
  onSaveGrade?: (grade: Grade) => void;
  onDeleteGrade?: (studentId: string, subject: string, term: number) => void;
  onAddStudent?: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  onRequestManualPdfLink?: (url: string, filename: string, title: string) => void;
}

const getStudentAge = (student: any) => {
  const numMatch = student?.grade?.match(/\d+/);
  if (numMatch) {
    const gradeNum = parseInt(numMatch[0]);
    return 6 + gradeNum;
  }
  return 10;
};

export const GradeTrackerSection: React.FC<GradeTrackerSectionProps> = ({ 
  students, 
  grades, 
  teachers = [],
  currentUserEmail = '',
  schoolConfig, 
  currentUserRole = 'principal', 
  onSaveGrade,
  onDeleteGrade,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onRequestManualPdfLink
}) => {
  // Find current teacher matching logged in email
  const currentTeacher = useMemo(() => {
    if (currentUserRole !== 'teacher' || !currentUserEmail || !teachers) return null;
    return teachers.find(t => t.email === currentUserEmail) || null;
  }, [currentUserRole, currentUserEmail, teachers]);

  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSection, setSelectedSection] = useState('A');
  const [activeSubTab, setActiveSubTab] = useState<'marklist' | 'roster' | 'attendance' | 'performance' | 'student-registration'>('marklist');
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [tableLayoutSnug, setTableLayoutSnug] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printScaling, setPrintScaling] = useState(100);
  const [a4Centering, setA4Centering] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfSuccess, setShowPdfSuccess] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Local student registration form states
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'Male' | 'Female'>('Male');
  const [newStudentParentEmail, setNewStudentParentEmail] = useState('');
  const [newStudentAge, setNewStudentAge] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Student Edit & Delete local states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentGender, setEditStudentGender] = useState<'Male' | 'Female'>('Male');
  const [editStudentAge, setEditStudentAge] = useState('');
  const [editStudentParentEmail, setEditStudentParentEmail] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      playInteractiveSound('wrong');
      alert('እባክዎን የተማሪውን ስም ያስገቡ (Please enter student name)');
      return;
    }

    if (!onAddStudent) return;

    const targetGrade = selectedGrade === 'All' ? (currentTeacher?.assignedClass || 'Grade 1') : selectedGrade;
    const targetSection = selectedSection;

    // Check for duplicate student (same name, grade, section)
    const isDuplicate = students.some(
      (s) =>
        s.name.trim().toLowerCase() === newStudentName.trim().toLowerCase() &&
        s.grade === targetGrade &&
        s.section === targetSection
    );

    if (isDuplicate) {
      playInteractiveSound('wrong');
      alert(`⚠️ ተማሪ "${newStudentName.trim()}" ቀደም ሲል በዚህ ክፍል (${targetGrade} ${targetSection}) ውስጥ ተመዝግቧል! (Student "${newStudentName.trim()}" is already registered in ${targetGrade} ${targetSection}!)`);
      return;
    }

    const randomId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
    const ageVal = newStudentAge.trim() ? parseInt(newStudentAge.trim(), 10) : undefined;
    const newStudent: Student = {
      id: randomId,
      name: newStudentName.trim(),
      grade: targetGrade,
      section: targetSection,
      gender: newStudentGender,
      registeredBy: currentUserEmail || 'teacher@school.com',
      timestamp: new Date().toISOString(),
      parentEmail: newStudentParentEmail.trim().toLowerCase() || undefined,
      age: ageVal && !isNaN(ageVal) ? ageVal : undefined
    };

    playInteractiveSound('register');
    onAddStudent(newStudent);
    setRegSuccessMsg(`✅ ተማሪው በተሳካ ሁኔታ ተመዝግቧል! መታወቂያው፡ ${randomId} ነው (Student Registered! ID: ${randomId})`);
    setNewStudentName('');
    setNewStudentParentEmail('');
    setNewStudentAge('');
    setTimeout(() => setRegSuccessMsg(null), 8000);
  };

  const handleOpenEditStudent = (student: Student) => {
    playInteractiveSound('click');
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentGender(student.gender);
    setEditStudentAge(student.age ? String(student.age) : '');
    setEditStudentParentEmail(student.parentEmail || '');
  };

  const handleEditStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentName.trim()) {
      alert('እባክዎን የተማሪውን ስም ያስገቡ (Please enter student name)');
      return;
    }

    const ageVal = editStudentAge.trim() ? parseInt(editStudentAge.trim(), 10) : undefined;
    const updated: Student = {
      ...editingStudent,
      name: editStudentName.trim(),
      gender: editStudentGender,
      age: ageVal && !isNaN(ageVal) ? ageVal : undefined,
      parentEmail: editStudentParentEmail.trim().toLowerCase() || undefined
    };

    onEditStudent?.(updated);
    playInteractiveSound('register');
    setEditingStudent(null);
  };

  const handleOpenDeleteStudent = (student: Student) => {
    playInteractiveSound('wrong');
    setDeletingStudent(student);
  };

  const handleDeleteStudentConfirm = () => {
    if (deletingStudent && onDeleteStudent) {
      onDeleteStudent(deletingStudent.id);
      playInteractiveSound('click');
      setDeletingStudent(null);
    }
  };

  // Available options defined early
  const gradeOptions = useMemo(() => {
    if (currentTeacher) {
      if (currentTeacher.classAllocations && currentTeacher.classAllocations.length > 0) {
        return Array.from(new Set(currentTeacher.classAllocations.map(alloc => alloc.grade)));
      }
      return [currentTeacher.assignedClass];
    }
    if (schoolConfig?.schoolLevel === 'secondary') {
      return ['All', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    }
    return ['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  }, [schoolConfig?.schoolLevel, currentTeacher]);

  const sectionOptions = useMemo(() => {
    if (currentTeacher) {
      if (currentTeacher.classAllocations && currentTeacher.classAllocations.length > 0) {
        return currentTeacher.classAllocations
          .filter(alloc => alloc.grade === selectedGrade)
          .map(alloc => alloc.section);
      }
      return [currentTeacher.assignedSection];
    }
    return ['A', 'B', 'C', 'D'];
  }, [currentTeacher, selectedGrade]);

  // Automatically bind teacher to their assigned class and section and correct tab
  React.useEffect(() => {
    if (currentTeacher) {
      const firstAlloc = currentTeacher.classAllocations?.[0] || { grade: currentTeacher.assignedClass, section: currentTeacher.assignedSection };
      setSelectedGrade(firstAlloc.grade);
      setSelectedSection(firstAlloc.section);
      if (!currentTeacher.isHomeroomTeacher) {
        setActiveSubTab('marklist');
      }
    }
  }, [currentTeacher]);

  // Sync selectedGrade with schoolLevel gradeOptions changes
  React.useEffect(() => {
    if (!gradeOptions.includes(selectedGrade)) {
      setSelectedGrade(gradeOptions[0] || 'Grade 1');
    }
  }, [gradeOptions, selectedGrade]);

  // Sync selectedSection with sectionOptions changes
  React.useEffect(() => {
    if (sectionOptions.length > 0 && !sectionOptions.includes(selectedSection)) {
      setSelectedSection(sectionOptions[0]);
    }
  }, [sectionOptions, selectedSection]);

  // Extra roster-specific student info: Conduct (ምግባር) and Absents (ቀሪ ቀናት)
  const [studentExtraInfo, setStudentExtraInfo] = useState<Record<string, { conduct: string; absent: number }>>(() => {
    const saved = localStorage.getItem('studentExtraInfo');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      'ID-4021': { conduct: 'A', absent: 2 },
      'ID-1082': { conduct: 'A', absent: 0 },
      'ID-8843': { conduct: 'B', absent: 4 },
      'ID-5531': { conduct: 'A', absent: 1 },
      'ID-9011': { conduct: 'B', absent: 3 },
      'ID-3245': { conduct: 'A+', absent: 0 }
    };
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const adjusted = new Date(local.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
  });

  const [dailyAttendance, setDailyAttendance] = useState<Record<string, Record<string, 'present' | 'absent' | 'excused'>>>(() => {
    const saved = localStorage.getItem('dailyAttendance');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const handleMarkAttendance = React.useCallback((studentId: string, status: 'present' | 'absent' | 'excused') => {
    setDailyAttendance(prev => {
      const dayRecord = prev[selectedDateStr] || {};
      const prevStatus = dayRecord[studentId];
      
      if (prevStatus === status) return prev;

      const updatedDayRecord = {
        ...dayRecord,
        [studentId]: status
      };

      const updated = {
        ...prev,
        [selectedDateStr]: updatedDayRecord
      };

      localStorage.setItem('dailyAttendance', JSON.stringify(updated));

      let diff = 0;
      if (prevStatus === 'absent' && status !== 'absent') {
        diff = -1;
      } else if (prevStatus !== 'absent' && status === 'absent') {
        diff = 1;
      }

      if (diff !== 0) {
        setStudentExtraInfo(prevExtra => {
          const extra = prevExtra[studentId] || { conduct: 'A', absent: 0 };
          const updatedExtra = {
            ...prevExtra,
            [studentId]: {
              ...extra,
              absent: Math.max(0, extra.absent + diff)
            }
          };
          localStorage.setItem('studentExtraInfo', JSON.stringify(updatedExtra));
          return updatedExtra;
        });
      }

      return updated;
    });
  }, [selectedDateStr]);

  const [selectedCardStudentId, setSelectedCardStudentId] = useState<string | null>(null);
  const [isPdfDownloadPreview, setIsPdfDownloadPreview] = useState(false);
  const [previewViewType, setPreviewViewType] = useState<'card' | 'list'>('card');
  const [selectedTerm, setSelectedTerm] = useState<number | 'annual'>(1);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type: 'delete' | 'bulk_approve' | 'bulk_clear';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    type: 'delete'
  });

  // Sync selectedTerm with evaluationMode changes and activeSubTab changes
  React.useEffect(() => {
    const isSemester = schoolConfig?.evaluationMode === 'semester';
    if (isSemester && selectedTerm !== 'annual' && selectedTerm > 2) {
      setSelectedTerm(1);
    }
  }, [schoolConfig?.evaluationMode, selectedTerm]);

  React.useEffect(() => {
    if (activeSubTab === 'marklist' && selectedTerm === 'annual') {
      setSelectedTerm(1);
    }
  }, [activeSubTab, selectedTerm]);

  // Edit States
  const [editModeActive, setEditModeActive] = useState(false);
  const [quickEditStudentId, setQuickEditStudentId] = useState<string | null>(null);
  const [quickEditSubject, setQuickEditSubject] = useState<string | null>(null);
  const [quickEditQuiz, setQuickEditQuiz] = useState<number | ''>('');
  const [quickEditCw, setQuickEditCw] = useState<number | ''>('');
  const [quickEditHw, setQuickEditHw] = useState<number | ''>('');
  const [quickEditMid, setQuickEditMid] = useState<number | ''>('');
  const [quickEditFinal, setQuickEditFinal] = useState<number | ''>('');
  const [quickEditError, setQuickEditError] = useState<string | null>(null);

  const activeTheme = useMemo(() => {
    const defaultTheme = {
      primary: 'bg-indigo-600 hover:bg-indigo-700',
      primaryText: 'text-indigo-600',
      lightBg: 'bg-indigo-50',
      border: 'border-indigo-100',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      shadow: 'shadow-indigo-100',
      accentBar: 'bg-indigo-600'
    };

    if (!schoolConfig?.themeColor) return defaultTheme;

    const themes = {
      indigo: defaultTheme,
      emerald: {
        primary: 'bg-emerald-600 hover:bg-emerald-700',
        primaryText: 'text-emerald-600',
        lightBg: 'bg-emerald-50',
        border: 'border-emerald-100',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
        shadow: 'shadow-emerald-100',
        accentBar: 'bg-emerald-500'
      },
      violet: {
        primary: 'bg-violet-600 hover:bg-violet-700',
        primaryText: 'text-violet-600',
        lightBg: 'bg-violet-50',
        border: 'border-violet-100',
        badge: 'bg-violet-50 text-violet-700 border-violet-100',
        shadow: 'shadow-violet-100',
        accentBar: 'bg-violet-600'
      },
      rose: {
        primary: 'bg-rose-600 hover:bg-rose-700',
        primaryText: 'text-rose-600',
        lightBg: 'bg-rose-50',
        border: 'border-rose-100',
        badge: 'bg-rose-50 text-rose-700 border-rose-100',
        shadow: 'shadow-rose-100',
        accentBar: 'bg-rose-500'
      },
      amber: {
        primary: 'bg-amber-600 hover:bg-amber-700',
        primaryText: 'text-amber-600',
        lightBg: 'bg-amber-50',
        border: 'border-amber-100',
        badge: 'bg-amber-50 text-amber-900 border-amber-100',
        shadow: 'shadow-amber-100',
        accentBar: 'bg-amber-500'
      },
      slate: {
        primary: 'bg-slate-700 hover:bg-slate-800',
        primaryText: 'text-slate-700',
        lightBg: 'bg-slate-100',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-800 border-slate-200',
        shadow: 'shadow-slate-100',
        accentBar: 'bg-slate-600'
      }
    };

    return themes[schoolConfig.themeColor as keyof typeof themes] || defaultTheme;
  }, [schoolConfig?.themeColor]);

  // Letter grades and comments helper
  const getLetterGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'text-emerald-700 bg-emerald-100 border-emerald-200', remark: 'እጅግ በጣም ከፍተኛ (Outstanding)' };
    if (score >= 85) return { grade: 'A', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', remark: 'እጅግ በጣም ከፍተኛ (Excellent)' };
    if (score >= 80) return { grade: 'B+', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', remark: 'በጣም ከፍተኛ (Very Good+)' };
    if (score >= 75) return { grade: 'B', color: 'text-indigo-600 bg-indigo-50 border-indigo-100', remark: 'በጣም ከፍተኛ (Very Good)' };
    if (score >= 65) return { grade: 'C+', color: 'text-amber-700 bg-amber-50 border-amber-200', remark: 'ከፍተኛ (Good+)' };
    if (score >= 60) return { grade: 'C', color: 'text-amber-600 bg-amber-50 border-amber-100', remark: 'ከፍተኛ (Good)' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-600 bg-orange-50 border-orange-100', remark: 'በቂ (Satisfactory)' };
    return { grade: 'F', color: 'text-rose-600 bg-rose-50 border-rose-100', remark: 'የማያልፍ (Fail)' };
  };

  // Dynamic subjects from schoolConfig
  const subjects = useMemo(() => {
    return schoolConfig?.subjects || ['Mathematics', 'English', 'Amharic', 'Science', 'Social Studies'];
  }, [schoolConfig]);

  const selectableSubjects = useMemo(() => {
    if (currentTeacher) {
      return currentTeacher.subjects;
    }
    return subjects;
  }, [currentTeacher, subjects]);

  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  const isTeachingTeacher = useMemo(() => {
    return currentUserRole === 'teacher' && currentTeacher !== null && currentTeacher.subjects.includes(selectedSubject);
  }, [currentUserRole, currentTeacher, selectedSubject]);

  // Sync selectedSubject with changes in subjects list
  React.useEffect(() => {
    if (selectableSubjects.length > 0 && !selectableSubjects.includes(selectedSubject)) {
      setSelectedSubject(selectableSubjects[0]);
    }
  }, [selectableSubjects, selectedSubject]);

  // Filter students by chosen Grade and Section & search query
  const filteredStudents = useMemo(() => {
    let result = students;
    if (selectedGrade !== 'All') {
      result = result.filter(s => s.grade === selectedGrade);
    }
    result = result.filter(s => s.section === selectedSection);
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.id.toLowerCase().includes(q)
      );
    }
    // Sort alphabetically by name
    return [...result].sort((a, b) => a.name.localeCompare(b.name, 'am'));
  }, [students, selectedGrade, selectedSection, studentSearchQuery]);

  // Stable alphabetical student list for the selected grade and section to give them a consistent serial number (ተራ ቁጥር)
  const sectionAlphabeticalStudents = useMemo(() => {
    let result = students;
    if (selectedGrade !== 'All') {
      result = result.filter(s => s.grade === selectedGrade);
    }
    result = result.filter(s => s.section === selectedSection);
    return [...result].sort((a, b) => a.name.localeCompare(b.name, 'am'));
  }, [students, selectedGrade, selectedSection]);

  const getStudentRollNumber = React.useCallback((studentId: string) => {
    const idx = sectionAlphabeticalStudents.findIndex(s => s.id === studentId);
    return idx !== -1 ? idx + 1 : '-';
  }, [sectionAlphabeticalStudents]);

  // Map students with their subject-specific grades
  const studentGradesData = useMemo(() => {
    return filteredStudents.map(student => {
      const termToFilter = selectedTerm === 'annual' ? 1 : selectedTerm;
      const gradeRecord = grades.find(g => g.studentId === student.id && g.subject === selectedSubject && (g.term || 1) === termToFilter);
      return {
        student,
        gradeRecord: gradeRecord || null,
        totalScore: gradeRecord ? gradeRecord.total : 0
      };
    }).sort((a, b) => b.totalScore - a.totalScore); // Sort by total score descending for ranking
  }, [filteredStudents, grades, selectedSubject, selectedTerm]);

  // Complete Roster data including all subjects, totals, averages, and ranks
  const studentRosterData = useMemo(() => {
    const data = filteredStudents.map(student => {
      const subjectGrades: Record<string, number | null> = {};
      let gradedCount = 0;
      let totalSum = 0;
      
      subjects.forEach(sub => {
        if (selectedTerm === 'annual') {
          const matchingGrades = grades.filter(grade => grade.studentId === student.id && grade.subject === sub);
          if (matchingGrades.length > 0) {
            const avgScore = Math.round(matchingGrades.reduce((acc, curr) => acc + curr.total, 0) / matchingGrades.length);
            subjectGrades[sub] = avgScore;
            totalSum += avgScore;
            gradedCount++;
          } else {
            subjectGrades[sub] = null;
          }
        } else {
          const g = grades.find(grade => grade.studentId === student.id && grade.subject === sub && (grade.term || 1) === selectedTerm);
          if (g) {
            subjectGrades[sub] = g.total;
            totalSum += g.total;
            gradedCount++;
          } else {
            subjectGrades[sub] = null;
          }
        }
      });

      const average = gradedCount > 0 ? Math.round(totalSum / gradedCount) : 0;
      const extra = studentExtraInfo[student.id] || { conduct: 'A', absent: 0 };

      return {
        student,
        subjectGrades,
        totalSum,
        gradedCount,
        average,
        conduct: extra.conduct,
        absent: extra.absent
      };
    });

    // Filter students who have at least one grade to rank them fairly
    const gradedStudents = data.filter(item => item.gradedCount > 0);
    const sortedGraded = [...gradedStudents].sort((a, b) => b.average - a.average);

    return data.map(item => {
      let rank: number | null = null;
      if (item.gradedCount > 0) {
        rank = sortedGraded.findIndex(s => s.student.id === item.student.id) + 1;
      }
      return {
        ...item,
        rank
      };
    }).sort((a, b) => {
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });
  }, [filteredStudents, grades, subjects, studentExtraInfo, selectedTerm]);

  const handleUpdateExtraInfo = (studentId: string, field: 'conduct' | 'absent', value: any) => {
    // Prevent editing if neither teacher nor principal
    if (currentUserRole !== 'teacher' && currentUserRole !== 'principal') {
      playInteractiveSound('wrong');
      return;
    }
    setStudentExtraInfo(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { conduct: 'A', absent: 0 }),
          [field]: field === 'absent' ? (parseInt(value) >= 0 ? parseInt(value) : 0) : value
        }
      };
      localStorage.setItem('studentExtraInfo', JSON.stringify(updated));
      return updated;
    });
  };

  // Inline edit handler for Mark List
  const handleInlineGradeChange = (studentId: string, field: 'quiz' | 'cw' | 'hw' | 'mid' | 'final', valueStr: string) => {
    if (!onSaveGrade || !isTeachingTeacher) return;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const activeTermNum = selectedTerm === 'annual' ? 1 : selectedTerm;
    const currentRecord = grades.find(g => g.studentId === studentId && g.subject === selectedSubject && (g.term || 1) === activeTermNum);
    
    // Disable editing if record is already approved
    if (currentRecord && currentRecord.isApproved) {
      playInteractiveSound('wrong');
      return;
    }

    const maxVals = { quiz: 100, cw: 100, hw: 100, mid: 100, final: 100 };
    const max = maxVals[field];
    
    let rawVal = valueStr === '' ? 0 : Number(valueStr);
    if (isNaN(rawVal)) rawVal = 0;
    if (rawVal < 0) rawVal = 0;
    if (rawVal > max) rawVal = max;

    const quiz = field === 'quiz' ? rawVal : (currentRecord?.quiz || 0);
    const cw = field === 'cw' ? rawVal : (currentRecord?.cw || 0);
    const hw = field === 'hw' ? rawVal : (currentRecord?.hw || 0);
    const mid = field === 'mid' ? rawVal : (currentRecord?.mid || 0);
    const final = field === 'final' ? rawVal : (currentRecord?.final || 0);
    
    const total = quiz + cw + hw + mid + final;

    const updatedGrade: Grade = {
      id: currentRecord?.id || 'g-' + Math.floor(1000 + Math.random() * 9000),
      studentId: student.id,
      studentName: student.name,
      subject: selectedSubject,
      quiz,
      cw,
      hw,
      mid,
      final,
      total,
      teacher: currentRecord?.teacher || 'teacher@school.com',
      timestamp: new Date().toISOString(),
      term: activeTermNum,
      isApproved: currentRecord?.isApproved || false
    };

    onSaveGrade(updatedGrade);
  };

  // Toggle approval state for grade record (Primary action for Principal)
  const handleToggleApprove = (studentId: string) => {
    if (!onSaveGrade) return;
    if (currentUserRole !== 'principal') {
      playInteractiveSound('wrong');
      return;
    }
    const activeTermNum = selectedTerm === 'annual' ? 1 : selectedTerm;
    const currentRecord = grades.find(g => g.studentId === studentId && g.subject === selectedSubject && (g.term || 1) === activeTermNum);
    
    if (currentRecord) {
      onSaveGrade({
        ...currentRecord,
        isApproved: !currentRecord.isApproved
      });
      playInteractiveSound('success');
    } else {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      onSaveGrade({
        id: 'g-' + Math.floor(1000 + Math.random() * 9000),
        studentId: student.id,
        studentName: student.name,
        subject: selectedSubject,
        quiz: 0,
        cw: 0,
        hw: 0,
        mid: 0,
        final: 0,
        total: 0,
        teacher: 'teacher@school.com',
        timestamp: new Date().toISOString(),
        term: activeTermNum,
        isApproved: true
      });
      playInteractiveSound('success');
    }
  };

  // Click handler to trigger single record deletion confirmation
  const handleDeleteClick = (studentId: string, studentName: string, record: Grade | null) => {
    if (!record) return;
    if (!isTeachingTeacher) {
      playInteractiveSound('wrong');
      alert('ውጤት ለመሰረዝ ፍቃድ የለዎትም። ይህንን ማስተማር የሚችለው ያንን የትምህርት አይነት የሚያስተምረው መምህር ብቻ ነው። (You do not have permission to delete this grade. Only the teaching teacher can do this.)');
      return;
    }
    if (record.isApproved) {
      playInteractiveSound('wrong');
      alert('ውጤቱ የጸደቀ ስለሆነ መሰረዝ አይቻልም። (This grade is approved and locked. It cannot be deleted.)');
      return;
    }
    playInteractiveSound('wrong');
    setConfirmModal({
      isOpen: true,
      title: 'የተማሪ ውጤት መሰረዝ (Delete Student Grade)',
      description: `${studentName} የተባለውን ተማሪ የ${selectedSubject} የክፍለ ጊዜ/ሩብ ዓመት ${selectedTerm === 'annual' ? 1 : selectedTerm} ውጤት በቋሚነት መሰረዝ ይፈልጋሉ? ይህ ድርጊት ከተረጋገጠ በኋላ ወደ ነበረበት መመለስ አይቻልም።`,
      type: 'delete',
      onConfirm: () => {
        if (onDeleteGrade) {
          onDeleteGrade(studentId, selectedSubject, selectedTerm === 'annual' ? 1 : selectedTerm);
          playInteractiveSound('success');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Click handler to trigger bulk approval confirmation
  const handleBulkApproveClick = () => {
    const termToFilter = selectedTerm === 'annual' ? 1 : selectedTerm;
    const unapprovedGrades = studentGradesData.filter(item => item.gradeRecord && !item.gradeRecord.isApproved);
    if (unapprovedGrades.length === 0) {
      playInteractiveSound('wrong');
      return;
    }
    playInteractiveSound('wrong');
    setConfirmModal({
      isOpen: true,
      title: 'ሁሉንም ውጤቶች በጅምላ ማጽደቅ (Bulk Approve All Grades)',
      description: `በክፍል ${selectedGrade}-${selectedSection} ውስጥ ለሚገኙ ተማሪዎች በሙሉ የ${selectedSubject} የክፍለ ጊዜ/ሩብ ዓመት ${termToFilter} ውጤቶችን ማጽደቅ ይፈልጋሉ? ይህም መምህራን ውጤቱን እንዳይቀይሩ ይቆልፋል።`,
      type: 'bulk_approve',
      onConfirm: () => {
        if (onSaveGrade) {
          unapprovedGrades.forEach(item => {
            if (item.gradeRecord) {
              onSaveGrade({
                ...item.gradeRecord,
                isApproved: true
              });
            }
          });
          playInteractiveSound('success');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Click handler to trigger bulk clear confirmation
  const handleBulkClearClick = () => {
    if (!isTeachingTeacher) {
      playInteractiveSound('wrong');
      alert('ውጤት ለመሰረዝ ፍቃድ የለዎትም። ይህንን ማስተማር የሚችለው ያንን የትምህርት አይነት የሚያስተምረው መምህር ብቻ ነው። (You do not have permission to delete these grades. Only the teaching teacher can do this.)');
      return;
    }
    const termToFilter = selectedTerm === 'annual' ? 1 : selectedTerm;
    const recordsToClear = studentGradesData.filter(item => item.gradeRecord);
    // If teacher, make sure we filter out approved records
    const clearableRecords = recordsToClear.filter(item => {
      if (currentUserRole === 'principal') return true;
      return item.gradeRecord && !item.gradeRecord.isApproved;
    });

    if (clearableRecords.length === 0) {
      playInteractiveSound('wrong');
      return;
    }

    playInteractiveSound('wrong');
    setConfirmModal({
      isOpen: true,
      title: 'የክፍል ውጤቶችን በጅምላ መሰረዝ (Bulk Clear/Delete All Grades)',
      description: `በክፍል ${selectedGrade}-${selectedSection} ውስጥ ለሚገኙ ተማሪዎች በሙሉ የ${selectedSubject} የክፍለ ጊዜ/ሩብ ዓመት ${termToFilter} ውጤቶችን መሰረዝ/ማጥፋት ይፈልጋሉ? ይህ ድርጊት ወደኋላ የማይመለስ እና ሁሉንም የክፍሉን ውጤቶች የሚያጠፋ ነው።`,
      type: 'bulk_clear',
      onConfirm: () => {
        if (onDeleteGrade) {
          clearableRecords.forEach(item => {
            onDeleteGrade(item.student.id, selectedSubject, termToFilter);
          });
          playInteractiveSound('success');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Quick edit for Roster cells
  const handleOpenQuickEdit = (student: Student, subject: string) => {
    if (currentUserRole !== 'teacher' || !currentTeacher || !currentTeacher.subjects.includes(subject)) {
      playInteractiveSound('wrong');
      alert('ውጤት ለማስገባት/ለማስተካከል ፍቃድ የለዎትም። ይህንን ማስተማር የሚችለው ያንን የትምህርት አይነት የሚያስተምረው መምህር ብቻ ነው። (You do not have permission to edit/save. Only the teaching teacher can do this.)');
      return;
    }
    playInteractiveSound('click');
    const activeTermNum = selectedTerm === 'annual' ? 1 : selectedTerm;
    const r = grades.find(g => g.studentId === student.id && g.subject === subject && (g.term || 1) === activeTermNum);
    setQuickEditStudentId(student.id);
    setQuickEditSubject(subject);
    setQuickEditQuiz(r ? r.quiz : 0);
    setQuickEditCw(r ? r.cw : 0);
    setQuickEditHw(r ? r.hw : 0);
    setQuickEditMid(r ? r.mid : 0);
    setQuickEditFinal(r ? r.final : 0);
    setQuickEditError(null);
  };

  const handleSaveQuickEdit = () => {
    if (!onSaveGrade || !quickEditStudentId || !quickEditSubject) return;

    if (currentUserRole !== 'teacher' || !currentTeacher || !currentTeacher.subjects.includes(quickEditSubject)) {
      playInteractiveSound('wrong');
      setQuickEditError('ውጤት ለማስገባት/ለማስተካከል ፍቃድ የለዎትም። ይህንን ማስተማር የሚችለው ያንን የትምህርት አይነት የሚያስተምረው መምህር ብቻ ነው። (You do not have permission to edit/save. Only the teaching teacher can do this.)');
      return;
    }

    const student = students.find(s => s.id === quickEditStudentId);
    if (!student) return;

    const q = Number(quickEditQuiz);
    const c = Number(quickEditCw);
    const h = Number(quickEditHw);
    const m = Number(quickEditMid);
    const f = Number(quickEditFinal);

    const isInvalid = (val: number, max: number) => isNaN(val) || val < 0 || val > max;

    if (isInvalid(q, 100) || isInvalid(c, 100) || isInvalid(h, 100) || isInvalid(m, 100) || isInvalid(f, 100)) {
      playInteractiveSound('wrong');
      setQuickEditError('እባክዎን ትክክለኛ ውጤት ያስገቡ! (Quiz: 0-100, CW: 0-100, HW: 0-100, Mid: 0-100, Final: 0-100)');
      return;
    }

    const activeTermNum = selectedTerm === 'annual' ? 1 : selectedTerm;
    const currentRecord = grades.find(g => g.studentId === quickEditStudentId && g.subject === quickEditSubject && (g.term || 1) === activeTermNum);

    if (currentRecord && currentRecord.isApproved) {
      playInteractiveSound('wrong');
      setQuickEditError('❌ ይህ ውጤት የጸደቀ ስለሆነ ማሻሻል አይቻልም። (This grade is approved and locked. It cannot be edited.)');
      return;
    }

    const total = q + c + h + m + f;

    const updatedGrade: Grade = {
      id: currentRecord?.id || 'g-' + Math.floor(1000 + Math.random() * 9000),
      studentId: student.id,
      studentName: student.name,
      subject: quickEditSubject,
      quiz: q,
      cw: c,
      hw: h,
      mid: m,
      final: f,
      total,
      teacher: currentRecord?.teacher || 'teacher@school.com',
      timestamp: new Date().toISOString(),
      term: activeTermNum,
      isApproved: currentRecord?.isApproved || false
    };

    playInteractiveSound('success');
    onSaveGrade(updatedGrade);
    
    // Close modal
    setQuickEditStudentId(null);
    setQuickEditSubject(null);
  };

  // Calculate stats for the selected class/section
  const classStats = useMemo(() => {
    if (activeSubTab === 'roster') {
      const scoredStudents = studentRosterData.filter(item => item.gradedCount > 0);
      const count = scoredStudents.length;
      if (count === 0) return { avg: 0, highest: 0, passRate: 0, passCount: 0 };

      const totalSum = scoredStudents.reduce((sum, item) => sum + item.average, 0);
      const highest = Math.max(...scoredStudents.map(item => item.average));
      const passCount = scoredStudents.filter(item => item.average >= 50).length;
      const passRate = Math.round((passCount / count) * 100);

      return {
        avg: Math.round(totalSum / count),
        highest,
        passRate,
        passCount
      };
    } else {
      const scoredStudents = studentGradesData.filter(item => item.gradeRecord !== null);
      const count = scoredStudents.length;
      if (count === 0) return { avg: 0, highest: 0, passRate: 0, passCount: 0 };

      const totalSum = scoredStudents.reduce((sum, item) => sum + (item.gradeRecord?.total || 0), 0);
      const highest = Math.max(...scoredStudents.map(item => item.gradeRecord?.total || 0));
      const passCount = scoredStudents.filter(item => (item.gradeRecord?.total || 0) >= 50).length;
      const passRate = Math.round((passCount / count) * 100);

      return {
        avg: Math.round(totalSum / count),
        highest,
        passRate,
        passCount
      };
    }
  }, [studentGradesData, studentRosterData, activeSubTab]);

  // Export CSV function (የዳታቤዝ ማውረጃ)
  const handleDownloadCSV = () => {
    playInteractiveSound('success');
    
    let csvString = "";
    
    if (activeSubTab === 'marklist') {
      csvString += `Subject: ${selectedSubject},Grade: ${selectedGrade},Section: ${selectedSection}\n`;
      csvString += "Student ID,Student Name,Quiz (10),Classwork (10),Homework (10),Midterm (20),Final (50),Total (100)\n";
      studentGradesData.forEach(item => {
        const r = item.gradeRecord;
        csvString += `${item.student.id},"${item.student.name.replace(/"/g, '""')},${r ? r.quiz : '-'},${r ? r.cw : '-'},${r ? r.hw : '-'},${r ? r.mid : '-'},${r ? r.final : '-'},${r ? r.total + '%' : '-'}\n`;
      });
    } else {
      csvString += `Class Roster: Grade ${selectedGrade}, Section ${selectedSection}\n`;
      csvString += "Rank,Student ID,Student Name," + subjects.join(',') + ",Total,Average,Conduct,Absent,Status\n";
      studentRosterData.forEach((item) => {
        const subjectScores = subjects.map(sub => item.subjectGrades[sub] !== null ? `${item.subjectGrades[sub]}` : '-').join(',');
        const status = item.gradedCount > 0 ? (item.average >= 50 ? 'PASS (አልፏል)' : 'FAIL (ወድቋል)') : 'No Grade';
        csvString += `${item.rank !== null ? item.rank : '-'},${item.student.id},"${item.student.name.replace(/"/g, '""')},${subjectScores},${item.totalSum},${item.average}%,${item.conduct},${item.absent},${status}\n`;
      });
    }

    // Add UTF-8 BOM to make sure Amharic displays perfectly in Excel
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedGrade}_Section_${selectedSection}_${activeSubTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger Print (ማተሚያ)
  const handlePrint = () => {
    setPdfError(null);
    playInteractiveSound('success');
    window.print();
  };

  // Direct Roster Print/PDF Save with automatic browser layout setup
  const handleDirectRosterPrint = () => {
    setPdfError(null);
    playInteractiveSound('success');
    setActiveSubTab('roster');
    setIsPrintPreview(true);
    // Let layout render the print dialog with correct parameters after a tiny delay
    setTimeout(() => {
      window.print();
    }, 600);
  };

  // Convert and Download PDF using html2canvas & jsPDF directly
  const exportElementToPDF = (elementId: string, filename: string, orientation: 'portrait' | 'landscape') => {
    playInteractiveSound('success');
    setIsGeneratingPDF(true);
    setPdfError(null);
    setPdfProgressMsg('ፒዲኤፍ ፋይሉ በመዘጋጀት ላይ ነው... እባክዎ ጥቂት ሰኮንዶች ይጠብቁ (Generating high-resolution PDF... Please wait)');

    const originalViewType = previewViewType;
    if (elementId === 'report-card-print-area') {
      setPreviewViewType('card');
    }

    let cleanupContext: any = null;
    try {
      cleanupContext = applyOklchCleanup(document, window);
    } catch (e) {
      console.error('Error starting oklch cleanup', e);
    }

    const restoreAll = () => {
      if (cleanupContext) {
        cleanupContext.restoreAll();
      }
      if (elementId === 'report-card-print-area') {
        setPreviewViewType(originalViewType);
      }
    };

    let isFinished = false;
    
    // Safety fallback timer: If PDF generation gets stuck (e.g. sandbox limits), fall back to native print.
    const safetyTimer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        setIsGeneratingPDF(false);
        restoreAll();
        console.warn('PDF generation exceeded time limit. Falling back to native vector printing.');
        alert('ቀጥታ ፒዲኤፍ ማውረዱ ዘግይቷል፤ ነገር ግን ትክክለኛውንና የተስተካከለውን ፒዲኤፍ ለማግኘት አሁን በሚመጣው የህትመት ገጽ ላይ "Save as PDF" (ፒዲኤፍ አድርገህ አስቀምጥ) የሚለውን ይምረጡ። (Direct PDF render timed out. For a perfect high-resolution document, we are opening the native print dialog. Please choose "Save as PDF" as the destination.)');
        
        if (elementId === 'report-card-print-area') {
          // Individual card modal is already open, just trigger native print directly!
          window.print();
        } else {
          // Open print preview mode natively for class roster
          setIsPrintPreview(true);
          setTimeout(() => {
            window.print();
          }, 500);
        }
      }
    }, 15000);

    setTimeout(async () => {
      try {
        if (elementId === 'report-card-print-area') {
          const frontEl = document.getElementById('report-card-print-area-front');
          const backEl = document.getElementById('report-card-print-area-back');

          if (frontEl && backEl) {
            setPdfProgressMsg('የፊት ገጽ በመዘጋጀት ላይ ነው... (Preparing front page...)');
            const canvasFront = await html2canvas(frontEl, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#faf8f2',
              scrollX: 0,
              scrollY: 0,
              windowWidth: 1200,
              onclone: (clonedDoc: Document) => {
                if (cleanupContext) {
                  cleanupContext.handleClone(clonedDoc, 'report-card-print-area-front');
                }
              }
            });

            setPdfProgressMsg('የጀርባ ገጽ በመዘጋጀት ላይ ነው... (Preparing back page...)');
            const canvasBack = await html2canvas(backEl, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#faf8f2',
              scrollX: 0,
              scrollY: 0,
              windowWidth: 1200,
              onclone: (clonedDoc: Document) => {
                if (cleanupContext) {
                  cleanupContext.handleClone(clonedDoc, 'report-card-print-area-back');
                }
              }
            });

            const imgDataFront = canvasFront.toDataURL('image/png');
            const imgDataBack = canvasBack.toDataURL('image/png');

            const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'mm',
              format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const marginX = 0;
            const marginY = 0;
            const imgWidth = pdfWidth;
            const imgHeight = pdfHeight;

            // Page 1: Front
            pdf.addImage(imgDataFront, 'PNG', marginX, marginY, imgWidth, imgHeight);

            // Add branding watermark across front page
            try {
              pdf.saveGraphicsState();
              pdf.setTextColor(225, 225, 225);
              pdf.setFont("Helvetica", "bold");
              pdf.setFontSize(28);
              const watermarkText = schoolConfig?.nameEng || "KIBR MIDDLE SCHOOL";
              pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
                align: 'center',
                angle: 35
              });
              pdf.restoreGraphicsState();
            } catch (e) {
              pdf.setTextColor(235, 235, 235);
              pdf.setFont("Helvetica", "bold");
              pdf.setFontSize(28);
              const watermarkText = schoolConfig?.nameEng || "KIBR MIDDLE SCHOOL";
              pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
                align: 'center',
                angle: 35
              });
            }

            // Page 2: Back
            pdf.addPage();
            pdf.addImage(imgDataBack, 'PNG', marginX, marginY, imgWidth, imgHeight);

            const finalFilename = `${filename}.pdf`;
            try {
              pdf.save(finalFilename);
            } catch (saveErr) {
              console.warn('Standard PDF save failed inside iframe', saveErr);
            }

            // Generate secure Blob URL for manual click download fallback
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            if (onRequestManualPdfLink) {
              onRequestManualPdfLink(blobUrl, finalFilename, `የተማሪ መግለጫ ካርድ (${filename})`);
            }

            isFinished = true;
            clearTimeout(safetyTimer);
            setIsGeneratingPDF(false);
            setShowPdfSuccess(true);
            playInteractiveSound('success');
            setTimeout(() => {
              setShowPdfSuccess(false);
            }, 3000);
            return;
          }
        }

        const element = document.getElementById(elementId);
        if (!element) {
          isFinished = true;
          clearTimeout(safetyTimer);
          setIsGeneratingPDF(false);
          restoreAll();
          setPdfError('ስህተት፡ ሊታተም የሚችለው አካል አልተገኘም (Error: Printable element not found)');
          alert('ስህተት፡ ሊታተም የሚችለው አካል አልተገኘም (Error: Printable element not found)');
          return;
        }

        const targetWidth = elementId === 'printable-area' 
          ? 1350 
          : (orientation === 'landscape' ? 1200 : 800);

        const scaleVal = elementId === 'printable-area' ? 1.5 : 2;

        // Render directly with html2canvas (Using layout isolation inside the clone to prevent scroll displacement or clip)
        const canvas = await html2canvas(element, {
          scale: scaleVal,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: targetWidth,
          onclone: (clonedDoc: Document) => {
            try {
              if (cleanupContext) {
                cleanupContext.handleClone(clonedDoc, elementId);
              }
              const clonedElement = clonedDoc.getElementById(elementId);
              if (clonedElement) {
                // Ensure all ancestor elements are fully visible and not overflow-hidden
                let parent = clonedElement.parentElement;
                while (parent && parent !== clonedDoc.body) {
                  parent.style.setProperty('overflow', 'visible', 'important');
                  parent.style.setProperty('display', 'block', 'important');
                  parent = parent.parentElement;
                }

                // Style the cloned element with exact layout bounds
                clonedElement.style.setProperty('max-width', 'none', 'important');
                clonedElement.style.setProperty('width', `${targetWidth}px`, 'important');
                clonedElement.style.setProperty('padding', '20px', 'important');
                clonedElement.style.setProperty('margin', '0', 'important');
                clonedElement.style.setProperty('background-color', '#ffffff', 'important');
                clonedElement.style.setProperty('color', '#0c0a09', 'important');
                clonedElement.style.setProperty('overflow', 'visible', 'important');
                clonedElement.classList.remove('max-w-4xl', 'max-w-5xl', 'max-w-3xl');

                // Force all nested overflow/scroll containers inside the cloned element to be fully expanded
                const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto, .overflow-y-auto, [class*="overflow-"]');
                scrollContainers.forEach((el: any) => {
                  el.style.setProperty('overflow', 'visible', 'important');
                  el.style.setProperty('max-height', 'none', 'important');
                  el.style.setProperty('max-width', 'none', 'important');
                });

                // Ensure SVG icons inside have readable/correct colors
                const svgIcons = clonedElement.querySelectorAll('svg');
                svgIcons.forEach((svg: any) => {
                  if (svg.classList.contains('text-stone-900') || svg.classList.contains('text-stone-950')) {
                    svg.style.setProperty('color', '#1c1917', 'important');
                  } else {
                    svg.style.setProperty('color', '#44403c', 'important');
                  }
                });

                // Traversal to clean all dark mode text coloring styles inside the sheet
                const allDescendants = clonedElement.getElementsByTagName('*');
                for (let i = 0; i < allDescendants.length; i++) {
                  const desc = allDescendants[i] as HTMLElement;
                  const isHeader = desc.tagName === 'TH';
                  const isTableCell = desc.tagName === 'TD';
                  
                  if (isHeader) {
                    desc.style.setProperty('color', '#ffffff', 'important');
                    desc.style.setProperty('background-color', '#000000', 'important');
                  } else {
                    desc.style.setProperty('color', '#000000', 'important');
                    
                    if (isTableCell) {
                      desc.style.setProperty('font-weight', '800', 'important');
                      desc.style.setProperty('color', '#000000', 'important');
                    }
                    
                    if (desc.classList.contains('bg-white') || desc.classList.contains('bg-stone-50') || desc.classList.contains('bg-slate-50')) {
                      desc.style.setProperty('background-color', '#ffffff', 'important');
                    }
                  }
                }
              }
            } catch (cloneErr) {
              console.error('Error in html2canvas clone style modifier:', cloneErr);
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');

        // Create a jsPDF document representing standard A4 printable sheet
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const marginX = orientation === 'landscape' ? 8 : 12;
        const imgWidth = pdfWidth - (marginX * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Break multi-page automatically if the content overflows
        if (imgHeight > pdfHeight - 20) {
          let heightLeft = imgHeight;
          let position = 10;
          pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - 20);

          while (heightLeft > 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
        } else {
          const marginY = Math.max(10, (pdfHeight - imgHeight) / 2);
          pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
        }

        const finalFilename = `${filename}.pdf`;

        // Try automatic save
        try {
          pdf.save(finalFilename);
        } catch (saveErr) {
          console.warn('Standard PDF save failed inside iframe', saveErr);
        }

        // Generate secure Blob URL for manual click download fallback
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        if (onRequestManualPdfLink) {
          onRequestManualPdfLink(blobUrl, finalFilename, `የክፍል ሪፖርት / ውጤት ሰሌዳ (${filename})`);
        }

        if (!isFinished) {
          isFinished = true;
          clearTimeout(safetyTimer);
          setIsGeneratingPDF(false);
          setShowPdfSuccess(true);
          playInteractiveSound('success');
          setTimeout(() => {
            setShowPdfSuccess(false);
          }, 3000);
        }
      } catch (err: any) {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(safetyTimer);
          console.error('PDF direct generation error:', err);
          setIsGeneratingPDF(false);
          const errMsg = err?.message || JSON.stringify(err);
          setPdfError(`ፒዲኤፍ ማውረድ አልተቻለም (Could not download PDF): ${errMsg}`);
          alert('ፒዲኤፍ ማውረድ አልተቻለም (Could not download PDF):\n' + errMsg);
        }
      } finally {
        restoreAll();
      }
    }, 600);
  };

  if (isPrintPreview) {
    return createPortal(
      <div className="print-preview-container">
        <div className="print-preview-inner">
          {/* CSS Print Stylesheet injected dynamically */}
          <style dangerouslySetInnerHTML={{__html: `
            /* On screen overlay style */
            .print-preview-container {
              position: fixed !important;
              inset: 0 !important;
              z-index: 999999 !important;
              background-color: rgba(28, 25, 23, 0.65) !important; /* backdrop color */
              backdrop-filter: blur(4px) !important;
              overflow-y: auto !important;
              padding: 2rem 1rem !important;
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
            }
            .print-preview-inner {
              background-color: #ffffff !important;
              color: #0c0a09 !important;
              border-radius: 1.5rem !important;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
              padding: 2rem !important;
              width: 100% !important;
              max-width: 64rem !important; /* max-w-5xl */
              margin-top: 1rem !important;
              margin-bottom: 2rem !important;
              box-sizing: border-box !important;
            }

            #printable-area {
              width: ${tableLayoutSnug ? 'auto' : '100%'} !important;
              max-width: 100% !important;
              background: white !important;
              box-sizing: border-box !important;
              zoom: ${printScaling / 100} !important;
              ${a4Centering ? 'margin: 0 auto !important;' : ''}
            }

            /* CRITICAL: Force all container divs to have visible overflow so that page breaks and canvas captures work perfectly */
            .print-preview-container div,
            .print-preview-container .overflow-x-auto,
            #printable-area div {
              overflow: visible !important;
              max-width: none !important;
            }

            .avoid-page-break,
            .print-preview-container tbody {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              break-inside: avoid-page !important;
            }

            /* Clean separate border grid layout allowing browser to respect break-inside on tbody */
            .roster-printable-table {
              display: table !important;
              width: ${tableLayoutSnug ? 'auto' : '100%'} !important;
              max-width: 100% !important;
              table-layout: auto !important;
              border-collapse: separate !important;
              border-spacing: 0 !important;
              border-top: 1px solid #000000 !important;
              border-left: 1px solid #000000 !important;
              margin: 0 auto !important;
            }

            .marklist-printable-table {
              display: table !important;
              width: ${tableLayoutSnug ? 'auto' : '100%'} !important;
              max-width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              margin: 0 auto !important;
            }

            #print-target-sheet {
              page-break-after: always !important;
              break-after: page !important;
            }

            #print-target-sheet table {
              table-layout: auto !important;
              width: ${tableLayoutSnug ? 'max-content' : '100%'} !important;
              max-width: 100% !important;
            }

            #print-target-sheet th,
            #print-target-sheet td {
              white-space: nowrap !important;
              ${tableLayoutSnug ? 'width: max-content !important;' : ''}
            }

            #print-target-sheet td.student-info-cell-name,
            #print-target-sheet td:nth-child(2) {
              white-space: normal !important;
              max-width: 180px !important;
            }

            ${tableLayoutSnug ? `
              .roster-printable-table th,
              .roster-printable-table td:not(.student-info-cell-name),
              .marklist-printable-table th,
              .marklist-printable-table td:not(:nth-child(2)) {
                white-space: nowrap !important;
                padding-left: 6px !important;
                padding-right: 6px !important;
              }
              .roster-printable-table td.student-info-cell-name {
                white-space: normal !important;
                max-width: 180px !important;
              }
              .marklist-printable-table td:nth-child(2) {
                white-space: normal !important;
                max-width: 180px !important;
              }
            ` : ''}

            .roster-printable-table thead {
              display: table-header-group !important;
            }

            .roster-printable-table tbody {
              display: table-row-group !important;
            }

            .roster-printable-table tr {
              display: table-row !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .roster-printable-table th {
              font-size: 10.5px !important;
              padding: 4px 2.5px !important;
              line-height: 1.2 !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              border-right: 1px solid #ffffff !important;
              border-bottom: 1px solid #ffffff !important;
              border-top: 1px solid #ffffff !important;
              border-left: 1px solid #ffffff !important;
              text-align: center !important;
              vertical-align: middle !important;
              color: #ffffff !important;
              background-color: #000000 !important;
            }

            .roster-printable-table td {
              display: table-cell !important;
              font-size: 10px !important;
              padding: 4px 2.5px !important;
              line-height: 1.2 !important;
              font-weight: 800 !important;
              border-right: 1px solid #000000 !important;
              border-bottom: 1px solid #000000 !important;
              border-top: none !important;
              border-left: none !important;
              vertical-align: middle !important;
              color: #000000 !important;
            }

            /* Guarantee perfect vertical pseudo-merged cells without using unstable rowspan attributes */
            .roster-printable-table td.student-info-cell {
              background-color: #ffffff !important;
              font-weight: 900 !important;
              font-size: 10px !important;
              text-align: center !important;
              color: #000000 !important;
            }
            
            .roster-printable-table td.student-info-cell-name {
              background-color: #ffffff !important;
              font-weight: 950 !important;
              font-size: 10px !important;
              text-align: left !important;
              padding-left: 5px !important;
              color: #000000 !important;
            }

            .roster-printable-table td.merged-cell-no-bottom {
              border-bottom: none !important;
            }

            /* FORCE PURE BLACK HEADERS AND WHITE TEXT REGARDLESS OF THE SYSTEM OR UTILITY THEMING */
            #printable-area th,
            #printable-area th *,
            .roster-printable-table th,
            .roster-printable-table th *,
            thead th,
            thead th * {
              background-color: #000000 !important;
              color: #ffffff !important;
              font-weight: 950 !important;
            }

            /* FORCE CRISP SOLID BLACK BORDERS ALWAYS EXCEPT BLACK HEADERS WHOSE BORDERS MUST BE WHITE */
            #printable-area table,
            #printable-area tr,
            #printable-area td,
            .roster-printable-table,
            .roster-printable-table tr,
            .roster-printable-table td {
              border-color: #000000 !important;
            }

            #printable-area th,
            .roster-printable-table th,
            thead th {
              border-color: #ffffff !important;
            }

            /* HIGH SPECIFICITY FORCED LIGHT THEME OVERRIDES FOR BOTH ON-SCREEN AND PRINT IN DARK MODE */
            html.dark .print-preview-container {
              background-color: rgba(28, 25, 23, 0.75) !important; /* Keep backdrop dark on-screen */
            }

            html.dark .print-preview-inner,
            html.dark #printable-area,
            html.dark #printable-area div,
            html.dark #printable-area .bg-white,
            html.dark #printable-area .bg-stone-50,
            html.dark #printable-area .bg-slate-50,
            html.dark #printable-area .bg-stone-100 {
              background-color: #ffffff !important;
              color: #000000 !important;
            }

            /* Make sure text elements inside the sheet render dark charcoal/black in dark mode */
            html.dark #printable-area,
            html.dark #printable-area *,
            html.dark #printable-area span,
            html.dark #printable-area h1,
            html.dark #printable-area h2,
            html.dark #printable-area p,
            html.dark #printable-area td {
              color: #000000 !important;
            }

            /* Prevent dark mode background color leakage inside cells while preserving custom highlighting classes */
            html.dark #printable-area td,
            html.dark #printable-area td * {
              background-color: #ffffff !important;
              color: #000000 !important;
            }

            /* PRESERVE BEAUTIFUL CUSTOM HIGHLIGHTING STYLES IN DARK MODE AND IN PRINT */
            /* Sem1, Sem2, and Annual Row Backgrounds */
            .print-bg-sem1,
            tr.print-bg-sem1,
            tr.print-bg-sem1 td,
            html.dark #printable-area tr.print-bg-sem1,
            html.dark #printable-area tr.print-bg-sem1 td {
              background-color: #f0f9ff !important;
              color: #0c4a6e !important;
            }

            .print-bg-sem2,
            tr.print-bg-sem2,
            tr.print-bg-sem2 td,
            html.dark #printable-area tr.print-bg-sem2,
            html.dark #printable-area tr.print-bg-sem2 td {
              background-color: #ecfdf5 !important;
              color: #064e3b !important;
            }

            .print-bg-annual,
            tr.print-bg-annual,
            tr.print-bg-annual td,
            html.dark #printable-area tr.print-bg-annual,
            html.dark #printable-area tr.print-bg-annual td {
              background-color: #fffbeb !important;
              color: #78350f !important;
            }

            /* Score columns highlights */
            .total-score-cell,
            html.dark #printable-area .total-score-cell {
              background-color: #eff6ff !important;
              color: #1e3a8a !important;
            }

            .passed-score-cell,
            html.dark #printable-area .passed-score-cell {
              background-color: #ecfdf5 !important;
              color: #047857 !important;
            }

            .failed-score-cell,
            html.dark #printable-area .failed-score-cell {
              background-color: #fef2f2 !important;
              color: #991b1b !important;
            }

            .first-place-cell,
            html.dark #printable-area .first-place-cell {
              background-color: #fef3c7 !important;
              color: #92400e !important;
            }

            .normal-rank-cell,
            .conduct-cell,
            html.dark #printable-area .normal-rank-cell,
            html.dark #printable-area .conduct-cell {
              background-color: #f5f3ff !important;
              color: #4c1d95 !important;
            }

            .low-score-cell,
            html.dark #printable-area .low-score-cell {
              color: #dc2626 !important;
            }

            .has-absence-cell,
            html.dark #printable-area .has-absence-cell {
              background-color: #fff1f2 !important;
              color: #9f1239 !important;
            }

            .no-absence-cell,
            html.dark #printable-area .no-absence-cell {
              background-color: #f0fdf4 !important;
              color: #15803d !important;
            }

            /* Protect specific dark mode utility overrides from hiding text inside tables */
            html.dark .print-preview-container [class*="text-stone-"],
            html.dark .print-preview-container [class*="text-slate-"],
            html.dark .print-preview-container [class*="text-gray-"],
            html.dark .print-preview-container [class*="text-indigo-"],
            html.dark .print-preview-container [class*="text-emerald-"],
            html.dark .print-preview-container [class*="text-amber-"],
            html.dark .print-preview-container [class*="text-rose-"],
            html.dark .print-preview-container [class*="text-violet-"] {
              color: #1c1917 !important;
            }

            /* Prevent layout styling overlaps on controls */
            html.dark .print-preview-container button,
            html.dark .print-preview-container button * {
              color: inherit !important;
              background-color: inherit !important;
            }
            html.dark .print-preview-container .bg-emerald-600 {
              background-color: #059669 !important;
              color: #ffffff !important;
            }
            html.dark .print-preview-container .bg-indigo-600 {
              background-color: #4f46e5 !important;
              color: #ffffff !important;
            }
            html.dark .print-preview-container .bg-stone-100 {
              background-color: #f5f5f4 !important;
              color: #44403c !important;
            }

            @media print {
              @page {
                size: A4 ${printOrientation} !important;
                margin: ${a4Centering ? '0mm' : (printOrientation === 'landscape' ? '2.5mm 3.5mm' : '6mm')} !important;
              }
              body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: ${a4Centering ? (printOrientation === 'landscape' ? '5mm 6mm' : '10mm 12mm') : '0'} !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* FORCE COLOR PRINTS IN BROWSER IN ANY SCENARIO */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Hide the entire application root to prevent any leaks/blank space, while preserving the print-preview portal */
              #root {
                display: none !important;
                visibility: hidden !important;
              }

              /* Reset overlay styles for print */
              .print-preview-container {
                position: static !important;
                inset: auto !important;
                z-index: auto !important;
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                display: block !important;
                visibility: visible !important;
              }
              .print-preview-inner {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                width: 100% !important;
                visibility: visible !important;
              }
              .no-print,
              .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
              #printable-area {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                visibility: visible !important;
                background-color: #ffffff !important;
                color: #000000 !important;
              }

              /* Ensure standard high-contrast black text inside printable elements when printing, overriding dark theme styles */
              #printable-area *:not(th):not(.bg-black) {
                color: #000000 !important;
              }

              /* Maintain pure black header backgrounds with crisp white text */
              #printable-area th,
              #printable-area th *,
              .roster-printable-table th,
              .roster-printable-table th *,
              #printable-area .bg-black,
              #printable-area .bg-black * {
                color: #ffffff !important;
                background-color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Super compact table settings specifically when printing */
              .roster-printable-table th {
                font-size: 10.5px !important;
                padding: 4px 2.5px !important;
                line-height: 1.2 !important;
              }

              .roster-printable-table td {
                font-size: 10px !important;
                padding: 4px 2.5px !important;
                line-height: 1.2 !important;
                color: #000000 !important;
                background-color: transparent !important;
              }

              .roster-printable-table td.student-info-cell,
              .roster-printable-table td.student-info-cell-name {
                font-size: 10.5px !important;
                color: #000000 !important;
              }

              .avoid-break-inside {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}} />
        {/* Header for print preview */}
        <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl mb-4 print:hidden no-print space-y-4 shadow-3xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-indigo-950 font-mono flex items-center gap-1">
                🖨️ የህትመት እይታ እና ቅንብሮች (Print Preview & Page Setup)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => exportElementToPDF('printable-area', customFilename || (selectedGrade + '_Section_' + selectedSection + '_' + activeSubTab), printOrientation)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" /> PDF አውርድ
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" /> አትም
              </button>
              <button 
                onClick={() => setIsPrintPreview(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                ዝጋ (Close)
              </button>
            </div>
          </div>

          {/* Dedicated print-specific setup panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-stone-200/80">
            {/* Control 1: Custom Filename */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">የፋይል ስም (File Name)</label>
              <input 
                type="text" 
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="የፋይል ስም (File Name)..."
                className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-150 outline-none w-full font-semibold"
              />
            </div>

            {/* Control 2: Table Cells Snug Fit Toggle */}
            <div className="flex flex-col gap-1 justify-center">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-1">የሰንጠረዥ ህዋሶች (Table Cells Width)</span>
              <button
                type="button"
                onClick={() => {
                  playInteractiveSound('click');
                  setTableLayoutSnug(!tableLayoutSnug);
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                  tableLayoutSnug 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                {tableLayoutSnug ? '✅ መካከለኛ መጠን (Snug)' : '❌ ሙሉ ስፋት (Full-width)'}
              </button>
            </div>

            {/* Control 3: Physical A4 Centering & Margins Toggle */}
            <div className="flex flex-col gap-1 justify-center">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-1">በA4 መካከል አሰልፍ (A4 Centering)</span>
              <button
                type="button"
                onClick={() => {
                  playInteractiveSound('click');
                  setA4Centering(!a4Centering);
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                  a4Centering 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                {a4Centering ? '✅ ማዕከላዊ አሰላለፍ (Centered)' : '❌ ነባሪ አሰላለፍ (Browser default)'}
              </button>
            </div>

            {/* Control 4: Print Orientation Toggle */}
            <div className="flex flex-col gap-1 justify-center">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-1">የህትመት አቅጣጫ (Orientation)</span>
              <button
                type="button"
                onClick={() => {
                  playInteractiveSound('click');
                  setPrintOrientation(printOrientation === 'portrait' ? 'landscape' : 'portrait');
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                  printOrientation === 'portrait' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {printOrientation === 'portrait' ? '📐 በቁመቱ (Portrait)' : '🔲 በጎኑ (Landscape)'}
              </button>
            </div>

            {/* Control 5: Scaling Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">የማጉያ ልኬት (Scale: {printScaling}%)</label>
                <button 
                  onClick={() => setPrintScaling(100)} 
                  className="text-[9px] text-indigo-600 hover:underline font-extrabold"
                >
                  መልስ (Reset)
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="70" 
                  max="115" 
                  step="5"
                  value={printScaling}
                  onChange={(e) => setPrintScaling(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

            {/* Warning / Guide Box (Hidden when printing) */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-stone-800 text-xs leading-relaxed print:hidden my-2 flex items-start gap-2.5 max-w-4xl mx-auto shadow-xs no-print">
              <span className="text-base">💡</span>
              <div>
                <p className="font-extrabold text-amber-950">ተግባራዊ መመሪያ (Help Guide):</p>
                <p className="mt-1">
                  በብሮውዘርዎ ወይም በiframe ገደብ ምክንያት <strong>"PDF አውርድ"</strong> የሚለው ቁልፍ በቀጥታ ካልሰራ፤ በቀላሉ <strong>"አትም" (Print)</strong> የሚለውን ቁልፍ ተጭነው፣ በሚመጣው የብሮውዘር ህትመት ሳጥን ውስጥ <strong>"Destination"</strong> የሚለውን <strong>"Save as PDF" (ፒዲኤፍ አድርገህ አስቀምጥ)</strong> በማድረግ ሙሉ ሮስተሩን በከፍተኛ ጥራት ማውረድ/ማስቀመጥ ይችላሉ።
                </p>
              </div>
            </div>

            {/* Main printable sheet */}
            <div id="printable-area" className="space-y-4 print:space-y-2 print:my-0 max-w-4xl mx-auto bg-white relative p-4 print:p-2">
              <div id="print-target-sheet" className="w-full h-full relative space-y-4 print:space-y-2 print:break-after-page" style={{ pageBreakAfter: 'always' }}>
                {/* Background Watermark/Logo pattern in print */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                {schoolConfig?.logoType === 'graduation' && <GraduationCap className="w-96 h-96 text-stone-900" />}
                {schoolConfig?.logoType === 'book' && <BookOpen className="w-96 h-96 text-stone-900" />}
                {schoolConfig?.logoType === 'shield' && <ShieldCheck className="w-96 h-96 text-stone-900" />}
                {schoolConfig?.logoType === 'award' && <Award className="w-96 h-96 text-stone-900" />}
              </div>

              {activeSubTab === 'roster' ? (
                <div className="text-center space-y-2 print:space-y-15 relative mb-4 print:mb-2 border-b-2 border-stone-900 pb-3 print:pb-1 w-full">
                  {/* First Box */}
                  <div className="border-2 border-stone-950 p-2 print:p-1.5 rounded-lg bg-stone-50 w-full">
                    <h1 className="text-2xl print:text-lg font-black text-stone-950 uppercase tracking-wider">
                      {schoolConfig?.nameEng || 'DILIGENT INTELLECTUALS ACADEMY'}
                    </h1>
                  </div>
                  {/* Second Box */}
                  <div className="border-2 border-stone-950 p-1.5 print:p-1 rounded-md bg-stone-50 w-full max-w-xl mx-auto mt-2">
                    <h2 className="text-sm print:text-xs font-black text-stone-900 uppercase tracking-wider">
                      Student Progress Roster ({schoolConfig?.evaluationMode === 'semester' ? 'Semester' : 'Quarter'})
                    </h2>
                  </div>
                  {/* Third Row: Grade & Academic Year */}
                  <div className="flex justify-between items-center w-full pt-1.5 text-xs font-bold px-1">
                    <div className="border border-stone-950 px-3 py-1 print:py-0.5 rounded-md bg-stone-50 flex items-center gap-1.5">
                      <span className="text-stone-600">Grade:</span>
                      <span className="font-extrabold text-stone-950 text-xs">
                        {selectedGrade === 'All' ? 'All Grades' : selectedGrade} - {selectedSection}
                      </span>
                    </div>
                    <div className="border border-stone-950 px-3 py-1 print:py-0.5 rounded-md bg-stone-50 flex items-center gap-1.5">
                      <span className="text-stone-600">ACADEMIC YEAR:</span>
                      <span className="font-extrabold text-stone-950 text-xs">
                        2018 E.C
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 border-b-2 border-stone-900 pb-4 relative">
                  <h1 className="text-2xl font-black text-stone-950 uppercase tracking-wide">
                    {schoolConfig?.nameAmh || 'ክብር መካከለኛ ደረጃ ትምህርት ቤት'}
                  </h1>
                  <p className="text-sm font-bold text-stone-700">
                    {schoolConfig?.nameEng || 'Kibr Middle School'} - የማርክ ሊስት (Mark List)
                  </p>
                  <p className="text-xs text-stone-400 italic">
                    "{schoolConfig?.mottoAmh || 'ለክህሎትና ለውጤታማነት እንተጋለን!'}"
                  </p>
                  <p className="text-xs text-stone-500 font-mono">Generated Date: {new Date().toLocaleDateString()} | Author: Principal’s Office</p>
                  <div className="flex justify-center gap-4 text-xs font-bold mt-2 flex-wrap">
                    <span className="bg-stone-100 px-3 py-1 rounded-md">ክፍል (Grade)፡ {selectedGrade === 'All' ? 'ሁሉም ክፍሎች (All Grades)' : selectedGrade}</span>
                    <span className="bg-stone-100 px-3 py-1 rounded-md">ሴክሽን (Section)፡ {selectedSection}</span>
                    <span className="bg-stone-100 px-3 py-1 rounded-md text-indigo-700">ትምህርት (Subject)፡ {selectedSubject}</span>
                  </div>
                </div>
              )}

              {/* Class stats on printed paper */}
              <div className="grid grid-cols-4 gap-3 print:gap-1.5 text-center border-b-2 border-stone-950 pb-3 print:pb-2 text-stone-900 w-full">
                <div className="p-2 print:p-1.5 border border-stone-950 rounded-lg bg-stone-50">
                  <span className="text-[10px] print:text-[8px] text-stone-600 block font-extrabold uppercase tracking-wide">ጠቅላላ ተማሪዎች / Students</span>
                  <strong className="text-lg print:text-sm font-black">{filteredStudents.length}</strong>
                </div>
                <div className="p-2 print:p-1.5 border border-stone-950 rounded-lg bg-stone-50">
                  <span className="text-[10px] print:text-[8px] text-stone-600 block font-extrabold uppercase tracking-wide">አማካይ ውጤት / Class Avg</span>
                  <strong className="text-lg print:text-sm font-black">{classStats.avg}%</strong>
                </div>
                <div className="p-2 print:p-1.5 border border-stone-950 rounded-lg bg-stone-50">
                  <span className="text-[10px] print:text-[8px] text-stone-600 block font-extrabold uppercase tracking-wide">ከፍተኛ ውጤት / Highest Score</span>
                  <strong className="text-lg print:text-sm font-black">{classStats.highest}%</strong>
                </div>
                <div className="p-2 print:p-1.5 border border-stone-950 rounded-lg bg-stone-50">
                  <span className="text-[10px] print:text-[8px] text-stone-600 block font-extrabold uppercase tracking-wide">የማለፍ ሪከርድ / Pass Rate</span>
                  <strong className="text-lg print:text-sm font-black">{classStats.passRate}%</strong>
                </div>
              </div>

              {/* Mark list table / roster table */}
              {activeSubTab === 'marklist' ? (
                <table className="w-full text-sm text-left border-collapse border border-stone-300 marklist-printable-table">
                  <thead>
                    <tr className="bg-black text-white font-bold border-b border-stone-300 text-xs" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                      <th className="p-2 border border-stone-300 bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>ተማሪ መታወቂያ</th>
                      <th className="p-2 border border-stone-300 bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>የተማሪ ሙሉ ስም</th>
                      <th className="p-2 border border-stone-300 text-center bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Quiz (10)</th>
                      <th className="p-2 border border-stone-300 text-center bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>CW (10)</th>
                      <th className="p-2 border border-stone-300 text-center bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>HW (10)</th>
                      <th className="p-2 border border-stone-300 text-center bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Mid (20)</th>
                      <th className="p-2 border border-stone-300 text-center bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Final (50)</th>
                      <th className="p-2 border border-stone-300 text-center font-black bg-black text-white" style={{ backgroundColor: '#000000', color: '#ffffff' }}>ጠቅላላ (100%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGradesData.map((item) => (
                      <tr key={item.student.id} className="border-b border-stone-200 text-xs text-stone-900 even:bg-stone-50">
                        <td className="p-2 font-mono border border-stone-300">{item.student.id}</td>
                        <td className="p-2 font-semibold border border-stone-300">{item.student.name}</td>
                        <td className="p-2 text-center border border-stone-300">{item.gradeRecord ? item.gradeRecord.quiz : '-'}</td>
                        <td className="p-2 text-center border border-stone-300">{item.gradeRecord ? item.gradeRecord.cw : '-'}</td>
                        <td className="p-2 text-center border border-stone-300">{item.gradeRecord ? item.gradeRecord.hw : '-'}</td>
                        <td className="p-2 text-center border border-stone-300">{item.gradeRecord ? item.gradeRecord.mid : '-'}</td>
                        <td className="p-2 text-center border border-stone-300">{item.gradeRecord ? item.gradeRecord.final : '-'}</td>
                        <td className="p-2 text-center border border-stone-300 font-bold">{item.gradeRecord ? item.gradeRecord.total + '%' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (() => {
                // Determine whether evaluationMode is semester or quarter
                const isSemester = schoolConfig?.evaluationMode === 'semester';

                // Row definitions per student
                const rowsToRender = isSemester 
                  ? [
                      { id: 'SEM1', label: 'SEM 1' },
                      { id: 'SEM2', label: 'SEM 2' },
                      { id: 'ANNUAL', label: 'ANNUAL' }
                    ]
                  : [
                      { id: 'Q1', label: 'Q1' },
                      { id: 'Q2', label: 'Q2' },
                      { id: 'SEM1_AVG', label: 'SEM 1 AVG' },
                      { id: 'Q3', label: 'Q3' },
                      { id: 'Q4', label: 'Q4' },
                      { id: 'SEM2_AVG', label: 'SEM 2 AVG' },
                      { id: 'ANNUAL', label: 'ANNUAL' }
                    ];

                // Helpers to fetch grades for specific term
                const getStudentGradeForTerm = (studentId: string, subject: string, termNum: number) => {
                  const g = grades.find(grade => grade.studentId === studentId && grade.subject === subject && (grade.term || 1) === termNum);
                  return g ? g.total : null;
                };

                const getSubjectSem1Avg = (studentId: string, sub: string) => {
                  const q1 = getStudentGradeForTerm(studentId, sub, 1);
                  const q2 = getStudentGradeForTerm(studentId, sub, 2);
                  if (q1 !== null && q2 !== null) return Math.round(((q1 + q2) / 2) * 100) / 100;
                  if (q1 !== null) return q1;
                  if (q2 !== null) return q2;
                  return null;
                };

                const getSubjectSem2Avg = (studentId: string, sub: string) => {
                  const q3 = getStudentGradeForTerm(studentId, sub, 3);
                  const q4 = getStudentGradeForTerm(studentId, sub, 4);
                  if (q3 !== null && q4 !== null) return Math.round(((q3 + q4) / 2) * 100) / 100;
                  if (q3 !== null) return q3;
                  if (q4 !== null) return q4;
                  return null;
                };

                const getSubjectAnnualAvg = (studentId: string, sub: string) => {
                  const scores = [1, 2, 3, 4].map(t => getStudentGradeForTerm(studentId, sub, t)).filter(s => s !== null) as number[];
                  if (scores.length > 0) {
                    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
                  }
                  return null;
                };

                const getSubjectAnnualAvgSem = (studentId: string, sub: string) => {
                  const scores = [1, 2].map(t => getStudentGradeForTerm(studentId, sub, t)).filter(s => s !== null) as number[];
                  if (scores.length > 0) {
                    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
                  }
                  return null;
                };

                const getTermAverage = (studentId: string, termNum: number) => {
                  let total = 0;
                  let count = 0;
                  subjects.forEach(sub => {
                    const score = getStudentGradeForTerm(studentId, sub, termNum);
                    if (score !== null) {
                      total += score;
                      count++;
                    }
                  });
                  return count > 0 ? Math.round((total / subjects.length) * 100) / 100 : null;
                };

                const getSem1Avg = (studentId: string) => {
                  let total = 0;
                  let count = 0;
                  subjects.forEach(sub => {
                    const val = getSubjectSem1Avg(studentId, sub);
                    if (val !== null) {
                      total += val;
                      count++;
                    }
                  });
                  return count > 0 ? Math.round((total / subjects.length) * 100) / 100 : null;
                };

                const getSem2Avg = (studentId: string) => {
                  let total = 0;
                  let count = 0;
                  subjects.forEach(sub => {
                    const val = getSubjectSem2Avg(studentId, sub);
                    if (val !== null) {
                      total += val;
                      count++;
                    }
                  });
                  return count > 0 ? Math.round((total / subjects.length) * 100) / 100 : null;
                };

                const getAnnualAvg = (studentId: string) => {
                  let total = 0;
                  let count = 0;
                  subjects.forEach(sub => {
                    const val = getSubjectAnnualAvg(studentId, sub);
                    if (val !== null) {
                      total += val;
                      count++;
                    }
                  });
                  return count > 0 ? Math.round((total / subjects.length) * 100) / 100 : null;
                };

                const getAnnualAvgSem = (studentId: string) => {
                  let total = 0;
                  let count = 0;
                  subjects.forEach(sub => {
                    const val = getSubjectAnnualAvgSem(studentId, sub);
                    if (val !== null) {
                      total += val;
                      count++;
                    }
                  });
                  return count > 0 ? Math.round((total / subjects.length) * 100) / 100 : null;
                };

                const getRankForTermType = (studentId: string, type: 'Q1' | 'Q2' | 'SEM1_AVG' | 'Q3' | 'Q4' | 'SEM2_AVG' | 'ANNUAL' | 'SEM1' | 'SEM2') => {
                  const targetGrade = students.find(st => st.id === studentId)?.grade;
                  const classStudents = students.filter(s => s.grade === targetGrade && s.section === selectedSection);
                  
                  const studentAverages = classStudents.map(s => {
                    let avg: number | null = null;
                    if (type === 'Q1') avg = getTermAverage(s.id, 1);
                    else if (type === 'Q2') avg = getTermAverage(s.id, 2);
                    else if (type === 'SEM1_AVG') avg = getSem1Avg(s.id);
                    else if (type === 'Q3') avg = getTermAverage(s.id, 3);
                    else if (type === 'Q4') avg = getTermAverage(s.id, 4);
                    else if (type === 'SEM2_AVG') avg = getSem2Avg(s.id);
                    else if (type === 'ANNUAL') avg = isSemester ? getAnnualAvgSem(s.id) : getAnnualAvg(s.id);
                    else if (type === 'SEM1') avg = getTermAverage(s.id, 1);
                    else if (type === 'SEM2') avg = getTermAverage(s.id, 2);
                    
                    return { studentId: s.id, avg };
                  });

                  const validAverages = studentAverages.filter(item => item.avg !== null) as { studentId: string; avg: number }[];
                  const sorted = [...validAverages].sort((a, b) => b.avg - a.avg);
                  const idx = sorted.findIndex(item => item.studentId === studentId);
                  if (idx !== -1) {
                    return (idx + 1) + '/' + classStudents.length;
                  }
                  return '-';
                };

                return (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-[10px] text-left border-collapse border roster-printable-table min-w-[1200px]" style={{ borderColor: '#000000' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#000000', borderBottom: '2px solid #ffffff' }}>
                          <th className="p-2 border font-bold text-center bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>No.</th>
                          <th className="p-2 border font-bold text-center bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>Name / ስም</th>
                          <th className="p-2 border font-bold text-center bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>Sex</th>
                          <th className="p-2 border font-bold text-center bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>Age</th>
                          <th className="p-2 border font-bold text-center bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>Term / ክፍል</th>
                          
                          {subjects.map(sub => (
                            <th key={sub} className="p-1 border text-center font-bold bg-black text-white" style={{ borderColor: '#ffffff', backgroundColor: '#000000', color: '#ffffff', verticalAlign: 'middle' }}>
                              {sub}
                            </th>
                          ))}
                          
                          {/* Distinctive, Pure Black Header Columns */}
                          <th className="p-2 border text-center font-black text-[10px] bg-black text-white" style={{ backgroundColor: '#000000', borderColor: '#ffffff', color: '#ffffff', verticalAlign: 'middle' }}>
                            ድምር<br/>Total
                          </th>
                          <th className="p-2 border text-center font-black text-[10px] bg-black text-white" style={{ backgroundColor: '#000000', borderColor: '#ffffff', color: '#ffffff', verticalAlign: 'middle' }}>
                            አማካይ<br/>Avg
                          </th>
                          <th className="p-2 border text-center font-black text-[10px] bg-black text-white" style={{ backgroundColor: '#000000', borderColor: '#ffffff', color: '#ffffff', verticalAlign: 'middle' }}>
                            ደረጃ<br/>Rank
                          </th>
                          <th className="p-2 border text-center font-black text-[10px] bg-black text-white" style={{ backgroundColor: '#000000', borderColor: '#ffffff', color: '#ffffff', verticalAlign: 'middle' }}>
                            ምግባር<br/>Cond.
                          </th>
                          <th className="p-2 border text-center font-black text-[10px] bg-black text-white" style={{ backgroundColor: '#000000', borderColor: '#ffffff', color: '#ffffff', verticalAlign: 'middle' }}>
                            ቀሪ<br/>Abs.
                          </th>
                        </tr>
                      </thead>
                      {filteredStudents.map((student, sIdx) => (
                        <tbody key={student.id} className="avoid-page-break" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                          {rowsToRender.map((row, rIdx) => {
                            const isFirstRow = rIdx === 0;

                            // Calculate subject scores
                            const subjectScores = subjects.map(sub => {
                              let score: number | null = null;
                              if (row.id === 'Q1') score = getStudentGradeForTerm(student.id, sub, 1);
                              else if (row.id === 'Q2') score = getStudentGradeForTerm(student.id, sub, 2);
                              else if (row.id === 'SEM1_AVG') score = getSubjectSem1Avg(student.id, sub);
                              else if (row.id === 'Q3') score = getStudentGradeForTerm(student.id, sub, 3);
                              else if (row.id === 'Q4') score = getStudentGradeForTerm(student.id, sub, 4);
                              else if (row.id === 'SEM2_AVG') score = getSubjectSem2Avg(student.id, sub);
                              else if (row.id === 'ANNUAL') score = isSemester ? getSubjectAnnualAvgSem(student.id, sub) : getSubjectAnnualAvg(student.id, sub);
                              else if (row.id === 'SEM1') score = getStudentGradeForTerm(student.id, sub, 1);
                              else if (row.id === 'SEM2') score = getStudentGradeForTerm(student.id, sub, 2);
                              return score;
                            });

                            // Calculate row sum and row average
                            const validScores = subjectScores.filter(s => s !== null) as number[];
                            const totalVal = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) * 100) / 100 : null;
                            const avgVal = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / subjects.length) * 100) / 100 : null;

                            // Calculate Rank
                            const rankVal = getRankForTermType(student.id, row.id as any);

                            // Get conduct and absent
                            const isTerminal = ['Q1', 'Q2', 'Q3', 'Q4', 'SEM1', 'SEM2'].includes(row.id);
                            const extra = studentExtraInfo[student.id] || { conduct: 'A', absent: 0 };
                            const condVal = isTerminal ? extra.conduct : '--';
                            const absVal = isTerminal ? extra.absent : '--';

                            // Determine classes for screen styling and print class hooks
                            const isSem1Highlight = row.id === 'SEM1_AVG' || row.id === 'SEM1' || row.id === 'Q1' || row.id === 'Q2';
                            const isSem2Highlight = row.id === 'SEM2_AVG' || row.id === 'SEM2' || row.id === 'Q3' || row.id === 'Q4';
                            const isAnnualHighlight = row.id === 'ANNUAL';

                            let rowBgClass = "hover:bg-stone-50";
                            let printRowClass = "";
                            let rowBgStyle = {};
                            if (row.id === 'SEM1_AVG' || row.id === 'SEM1') {
                              rowBgClass = "text-sky-950 font-semibold";
                              rowBgStyle = { backgroundColor: '#f0f9ff', color: '#0c4a6e' };
                              printRowClass = "print-bg-sem1";
                            } else if (row.id === 'SEM2_AVG' || row.id === 'SEM2') {
                              rowBgClass = "text-emerald-950 font-semibold";
                              rowBgStyle = { backgroundColor: '#ecfdf5', color: '#064e3b' };
                              printRowClass = "print-bg-sem2";
                            } else if (row.id === 'ANNUAL') {
                              rowBgClass = "text-amber-950 font-extrabold";
                              rowBgStyle = { backgroundColor: '#fffbeb', color: '#78350f' };
                              printRowClass = "print-bg-annual";
                            }

                            // Distinct styling variables for the 5 metrics columns
                            const isFailed = avgVal !== null && avgVal < 50;
                            const isFirstPlace = rankVal && rankVal.startsWith('1/');
                            const isAConduct = ['A+', 'A', 'A-'].includes(condVal);
                            const absentNum = parseInt(absVal) || 0;
                            const hasAbsence = absentNum > 0;

                            return (
                              <tr key={student.id + '-' + row.id} className={'border-b border-stone-300 text-stone-900 ' + rowBgClass + ' ' + printRowClass} style={rowBgStyle}>
                                {/* No. Column Cell */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-bold text-xs bg-white text-stone-950 font-mono student-info-cell ${rIdx < rowsToRender.length - 1 ? 'merged-cell-no-bottom' : ''}`}
                                >
                                  {isFirstRow ? sIdx + 1 : ""}
                                </td>

                                {/* Name Column Cell */}
                                <td 
                                  className={`p-1.5 border border-stone-950 font-black text-xs text-stone-950 min-w-[150px] bg-white student-info-cell-name ${rIdx < rowsToRender.length - 1 ? 'merged-cell-no-bottom' : ''}`}
                                >
                                  {isFirstRow ? student.name : ""}
                                </td>

                                {/* Sex Column Cell */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-bold text-xs bg-white text-stone-950 student-info-cell ${rIdx < rowsToRender.length - 1 ? 'merged-cell-no-bottom' : ''}`}
                                >
                                  {isFirstRow ? (student.gender === 'Female' || student.gender === 'F' ? 'F' : 'M') : ""}
                                </td>

                                {/* Age Column Cell */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-bold text-xs bg-white text-stone-950 font-mono student-info-cell ${rIdx < rowsToRender.length - 1 ? 'merged-cell-no-bottom' : ''}`}
                                >
                                  {isFirstRow ? getStudentAge(student) : ""}
                                </td>
                                
                                <td className="p-1 border border-stone-950 text-center text-[10px] font-black uppercase text-stone-900 student-info-cell">
                                  {row.label}
                                </td>

                                {subjectScores.map((score, idx) => {
                                  const isLow = score !== null && score < 50;
                                  return (
                                    <td 
                                      key={idx} 
                                      className={`p-1 border border-stone-950 text-center font-bold text-xs font-mono score-cell ${isLow ? 'low-score-cell' : ''}`}
                                      style={{ 
                                        color: score === null ? '#a8a29e' : isLow ? '#dc2626' : '#1c1917' 
                                      }}
                                    >
                                      {score !== null ? (score % 1 === 0 ? score.toFixed(1) : score.toFixed(2)) : '0.0'}
                                    </td>
                                  );
                                })}

                                {/* Total Score with rich custom styling */}
                                <td 
                                  className="p-1 border border-stone-950 text-center font-black text-xs font-mono total-score-cell"
                                  style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}
                                >
                                  {totalVal !== null ? totalVal.toFixed(1) : '0.0'}
                                </td>

                                {/* Average Score with clear indicator for failing/passing */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-black text-xs font-mono avg-score-cell ${isFailed ? 'failed-score-cell' : 'passed-score-cell'}`}
                                  style={{ 
                                    backgroundColor: isFailed ? '#fef2f2' : '#ecfdf5', 
                                    color: isFailed ? '#991b1b' : '#047857' 
                                  }}
                                >
                                  {avgVal !== null ? avgVal.toFixed(1) : '0.0'}
                                </td>

                                {/* Rank Column with dynamic gold styling for 1st place */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-black text-xs font-mono rank-score-cell ${isFirstPlace ? 'first-place-cell' : 'normal-rank-cell'}`}
                                  style={{ 
                                    backgroundColor: isFirstPlace ? '#fef3c7' : '#f5f3ff', 
                                    color: isFirstPlace ? '#92400e' : '#4c1d95' 
                                  }}
                                >
                                  {rankVal}
                                </td>

                                {/* Conduct/Behavior grade style */}
                                <td 
                                  className="p-1 border border-stone-950 text-center font-black text-xs conduct-cell"
                                  style={{ 
                                    backgroundColor: '#f5f3ff', 
                                    color: isAConduct ? '#065f46' : '#701a75' 
                                  }}
                                >
                                  {condVal}
                                </td>

                                {/* Absence tracker style: red alerts for non-zero absences */}
                                <td 
                                  className={`p-1 border border-stone-950 text-center font-black text-xs font-mono absence-cell ${hasAbsence ? 'has-absence-cell' : 'no-absence-cell'}`}
                                  style={{ 
                                    backgroundColor: hasAbsence ? '#fff1f2' : '#f0fdf4', 
                                    color: hasAbsence ? '#9f1239' : '#15803d' 
                                  }}
                                >
                                  {absVal}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      ))}
                    </table>


              {/* Official Signatures & Seal Section */}
              {activeSubTab !== 'roster' && (
                <div className="grid grid-cols-3 gap-6 pt-16 items-center text-stone-900">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-10 w-4/5 border-b border-stone-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-indigo-800 font-semibold text-xs">Girma_B</span>
                    </div>
                    <p className="font-black text-[10px] text-stone-700 mt-1">የክፍሉ መምህር ፊርማ (Homeroom Teacher)</p>
                  </div>

                  <div className="flex justify-center select-none">
                    {/* Circular Official Seal of School on printed sheet */}
                    <div className="relative w-24 h-24 rounded-full border-4 border-double border-blue-600/75 flex flex-col items-center justify-center p-1.5 text-center rotate-[-4deg] bg-blue-50/10 shrink-0 font-sans shadow-xs scale-90">
                      <div className="absolute inset-1 rounded-full border border-dashed border-blue-600/70"></div>
                      <span className="text-[5px] font-black uppercase tracking-wider text-blue-600/85 leading-none">ኪብር መካከለኛ ደረጃ ትምህርት ቤት</span>
                      <span className="text-[5px] font-bold text-blue-600/60 my-0.5">★ OFFICIAL ★</span>
                      <span className="text-[6px] font-extrabold text-blue-600/85 tracking-widest leading-none border border-blue-600/60 px-1 py-0.5 rounded-xs bg-white/40">APPROVED</span>
                      <span className="text-[5px] font-black text-blue-600/70 uppercase tracking-widest mt-0.5">Addis Ababa, ET</span>
                      <span className="absolute text-[7px] font-serif italic text-blue-800/80 font-bold bottom-2.5 right-3 transform rotate-[15deg]">Yonas K.</span>
                    </div>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className="h-10 w-4/5 border-b border-stone-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-indigo-800 font-semibold text-xs">Yonas K.</span>
                    </div>
                    <p className="font-black text-[10px] text-stone-700 mt-1">የርዕሰ መምህር ማህተምና ፊርማ (Principal Sign-off)</p>
                  </div>
                </div>
              )}

              {activeSubTab === 'roster' && (() => {
                const maleCount = filteredStudents.filter(s => s.gender === 'Male' || s.gender === 'M').length;
                const femaleCount = filteredStudents.filter(s => s.gender === 'Female' || s.gender === 'F').length;
                const totalCount = filteredStudents.length;
                return (
                  <div className="avoid-break-inside w-full" style={{ breakInside: 'avoid' }}>
                    <div className="flex justify-between items-end gap-6 mt-8 print:mt-6 text-stone-900 pt-6 print:pt-4 font-sans w-full">
                      {/* Sex Count table */}
                      <div className="border border-stone-950 rounded-lg overflow-hidden text-xs print:text-[10px] bg-white flex font-sans shadow-sm shrink-0 print:shadow-none">
                        <div className="px-3.5 py-1 bg-stone-50 border-r border-stone-950 flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-600">🙋‍♂️ ወንድ (Male):</span>
                          <span className="font-black text-indigo-700">{maleCount}</span>
                        </div>
                        <div className="px-3.5 py-1 bg-stone-50 border-r border-stone-950 flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-600">🙋‍♀️ ሴት (Female):</span>
                          <span className="font-black text-rose-600">{femaleCount}</span>
                        </div>
                        <div className="px-3.5 py-1 bg-stone-100 flex items-center gap-1.5 font-extrabold">
                          <span className="text-stone-900">📊 ድምር (Total):</span>
                          <span className="text-stone-950 font-black">{totalCount}</span>
                        </div>
                      </div>

                      {/* Teacher / Director Signatures */}
                      <div className="flex gap-10 print:gap-8 text-center text-xs print:text-[11px] font-black pb-1">
                        <div className="flex flex-col items-center w-44 print:w-36">
                          <div className="border-b-2 border-stone-950 w-full h-8 print:h-6 mb-1 flex items-end justify-center font-serif italic text-stone-600 text-sm print:text-xs">
                            Girma_B
                          </div>
                          <div className="font-extrabold text-stone-900">Teacher's Signature</div>
                          <div className="text-[10px] print:text-[8px] text-stone-500 font-bold">የመምህሩ ፊርማ</div>
                        </div>
                        <div className="flex flex-col items-center w-44 print:w-36">
                          <div className="border-b-2 border-stone-950 w-full h-8 print:h-6 mb-1 flex items-end justify-center font-serif italic text-stone-600 text-sm print:text-xs">
                            Ayalew_K
                          </div>
                          <div className="font-extrabold text-stone-900">Director's Signature</div>
                          <div className="text-[10px] print:text-[8px] text-stone-500 font-bold">የዳይሬክተሩ ፊርማ</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer of Print Pane */}
                    <div className="border-t border-stone-200 pt-4 mt-8 text-center text-[10px] text-stone-400 font-semibold print:hidden flex justify-between">
                      <span>© 2026 Kibr School Management System</span>
                      <span>ልዩ ህትመት ማኔጅመንት ፖርታል</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}
              </div> {/* closes #print-target-sheet */}
      </div> {/* closes #printable-area */}
    </div> {/* closes .print-preview-inner */}
  </div>,
  document.body
);
}

      return (
        <div className="space-y-6 grade-tracker-section-container">
          <style dangerouslySetInnerHTML={{__html: `
            /* On-screen tables styling overrides to ensure they don't stretch excessively */
            .grade-tracker-section-container table:not(.no-snug-override) {
              width: auto !important;
              max-width: 100% !important;
              margin-left: auto !important;
              margin-right: auto !important;
              table-layout: auto !important;
            }
            
            .grade-tracker-section-container table:not(.no-snug-override) th,
            .grade-tracker-section-container table:not(.no-snug-override) td {
              white-space: nowrap !important;
              padding-left: 12px !important;
              padding-right: 12px !important;
            }

            /* Allow student name and ID column or specific wrapping cells to wrap beautifully */
            .grade-tracker-section-container table:not(.no-snug-override) td.student-name-cell,
            .grade-tracker-section-container table:not(.no-snug-override) th.student-name-cell {
              white-space: normal !important;
              min-width: 160px !important;
              max-width: 220px !important;
            }
            
            /* Custom styling to keep specific tables like attendance compact */
            .grade-tracker-section-container .overflow-x-auto {
              display: flex;
              justify-content: center;
              width: 100%;
              overflow-x: auto;
            }
            
            /* If the table overflows, allow it to align left inside its flex container */
            .grade-tracker-section-container .overflow-x-auto table {
              flex-shrink: 0;
            }
          `}} />
          {/* Main Panel View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600 w-5.5 h-5.5" /> ክፍል-ተኮር ውጤት መከታተያ (Grade & Rank Analyzer)
          </h3>
          <p className="text-stone-400 text-xs mt-0.5">Filter grades, generate mark lists and official class rosters</p>
        </div>

        {/* CONTROLS: CLASS, SECTION & SUBJECT DROPDOWN BUTTONS (በሴክሽን፣ በክፍል እናበትምህርት አይነት ድሮፕ ዳውን በተን) */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === 'marklist' && (
            <div className="flex items-center gap-1.5 bg-indigo-50/40 border border-indigo-100 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-700 uppercase">ትምህርት (Subject):</span>
              <select
                value={selectedSubject}
                onChange={(e) => { playInteractiveSound('click'); setSelectedSubject(e.target.value); }}
                className="text-xs font-bold text-indigo-900 bg-transparent outline-none cursor-pointer"
              >
                {selectableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-stone-500 uppercase">ክፍል:</span>
            {currentTeacher ? (
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" /> {selectedGrade}
              </span>
            ) : (
              <select
                value={selectedGrade}
                onChange={(e) => { playInteractiveSound('click'); setSelectedGrade(e.target.value); }}
                className="text-xs font-bold text-stone-800 bg-transparent outline-none cursor-pointer"
              >
                {gradeOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'ሁሉም ክፍሎች (All)' : opt}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-stone-500 uppercase">ሴክሽን:</span>
            {currentTeacher ? (
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" /> {selectedSection}
              </span>
            ) : (
              <select
                value={selectedSection}
                onChange={(e) => { playInteractiveSound('click'); setSelectedSection(e.target.value); }}
                className="text-xs font-bold text-stone-800 bg-transparent outline-none cursor-pointer"
              >
                {sectionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>

          {/* Search Bar Input for Student Name or ID */}
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl w-full sm:w-64 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              placeholder="ተማሪ በስም ወይም መታወቂያ ፈልግ... (Search Name or ID)"
              className="text-xs font-bold text-stone-800 bg-transparent outline-none w-full placeholder-stone-400"
            />
            {studentSearchQuery && (
              <button 
                type="button" 
                onClick={() => { playInteractiveSound('click'); setStudentSearchQuery(''); }} 
                className="text-stone-400 hover:text-stone-600 focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-indigo-50/20 border border-indigo-100/40 p-4 rounded-2xl">
        <div className="text-center md:text-left">
          <span className="text-[10px] text-stone-400 block font-bold uppercase">በክፍሉ ያሉ ተማሪዎች</span>
          <strong className="text-xl font-black text-stone-900">{filteredStudents.length} ተማሪ</strong>
        </div>
        <div className="text-center md:text-left">
          <span className="text-[10px] text-stone-400 block font-bold uppercase">የማለፍ መጠን (Pass Rate)</span>
          <strong className="text-xl font-black text-indigo-700">{classStats.passRate}%</strong>
        </div>
        <div className="text-center md:text-left">
          <span className="text-[10px] text-stone-400 block font-bold uppercase">አማካይ ውጤት (Average)</span>
          <strong className="text-xl font-black text-emerald-700">{classStats.avg}%</strong>
        </div>
        <div className="text-center md:text-left">
          <span className="text-[10px] text-stone-400 block font-bold uppercase">ከፍተኛ ውጤት (Top Score)</span>
          <strong className="text-xl font-black text-amber-600">{classStats.highest}%</strong>
        </div>
      </div>

      {/* Role-Based Permissions & Edit Mode Banner */}
      <div className="p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50 border border-stone-200 text-stone-700">
        <div className="flex items-center gap-2.5">
          {isTeachingTeacher ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Unlock className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-black uppercase">
              {isTeachingTeacher 
                ? `የ${selectedSubject} መምህር - የውጤት መሙያ እና ማስተካከያ ፍቃድ` 
                : currentUserRole === 'teacher' 
                  ? 'መምህር - የውጤት መመልከቻ ብቻ (ያስተምሩትን ትምህርት ብቻ ነው ማስተካከል የሚችሉት)' 
                  : 'ርዕሰ መምህር - የውጤት መመልከቻ ብቻ (Principal Access - Read Only)'}
            </h4>
            <p className="text-[11px] opacity-75 mt-0.5">
              {isTeachingTeacher 
                ? 'የማርክ ሊስት ሰንጠረዥን በቀጥታ እዚህ ላይ መሙላት እና ማስተካከል ይችላሉ።' 
                : currentUserRole === 'teacher' 
                  ? 'የዚህን ትምህርት አይነት ስለማያስተምሩ ማየት ብቻ ነው የሚፈቀድልዎ።' 
                  : 'ውጤቶችን እና ሮስተሩን መመልከት ብቻ ይችላሉ። ማስተካከል አይፈቀድም።'}
            </p>
          </div>
        </div>

        {isTeachingTeacher && (
          <button
            onClick={() => {
              playInteractiveSound('click');
              setEditModeActive(prev => !prev);
            }}
            className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ' + (editModeActive ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-700')}
          >
            {editModeActive ? (
              <>
                <Save className="w-3.5 h-3.5" /> አርትዖት ሁነታን አጥፋ (Disable Edit)
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 animate-pulse" /> በሰንጠረዡ ላይ ሙላ / አስተካክል (Enable Edit)
              </>
            )}
          </button>
        )}
      </div>

      {/* Sub tabs: Mark List vs Roster */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => { 
              playInteractiveSound('click'); 
              setActiveSubTab('marklist'); 
              setPrintOrientation('portrait');
            }}
            className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ' + (activeSubTab === 'marklist' ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50')}
          >
            <FileSpreadsheet className="w-4 h-4" /> የማርክ ሊስት (Mark List)
          </button>
          
          {/* Roster is shown for Principal, Parents, or Homeroom Teachers only */}
          {((currentUserRole !== 'teacher') || (currentTeacher && currentTeacher.isHomeroomTeacher)) && (
            <button
              onClick={() => { 
                playInteractiveSound('click'); 
                setActiveSubTab('roster'); 
                setPrintOrientation('landscape');
              }}
              className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ' + (activeSubTab === 'roster' ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50')}
            >
              <Award className="w-4 h-4" /> የክፍል ሮስተር (Roster Table)
            </button>
          )}

          {/* Attendance is shown ONLY for Homeroom Teachers */}
          {(currentUserRole === 'teacher' && currentTeacher && currentTeacher.isHomeroomTeacher) && (
            <button
              onClick={() => { playInteractiveSound('click'); setActiveSubTab('attendance'); }}
              className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ' + (activeSubTab === 'attendance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50')}
            >
              <Users className="w-4 h-4" /> አቴንዳንስ መሙያ (Attendance)
            </button>
          )}

          {/* Performance Dashboard is shown for Teachers and Principals */}
          {(currentUserRole === 'teacher' || currentUserRole === 'principal') && (
            <button
              onClick={() => { playInteractiveSound('click'); setActiveSubTab('performance'); }}
              className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ' + (activeSubTab === 'performance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50')}
            >
              <TrendingUp className="w-4 h-4" /> አፈጻጸም ዳሽቦርድ (Performance)
            </button>
          )}

          {/* Student Registration is shown ONLY for Homeroom Teachers */}
          {(currentUserRole === 'teacher' && currentTeacher && currentTeacher.isHomeroomTeacher) && (
            <button
              onClick={() => { playInteractiveSound('click'); setActiveSubTab('student-registration'); }}
              className={'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ' + (activeSubTab === 'student-registration' ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50')}
            >
              <PlusCircle className="w-4 h-4" /> ተማሪዎች ምዝገባ (Registration)
            </button>
          )}
        </div>

        {/* PRINT & DOWNLOAD BUTTONS (ማውረጃ እና ማተሚያ) */}
        {(activeSubTab === 'marklist' || activeSubTab === 'roster') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              title="Download CSV from database"
            >
              <Download className="w-3.5 h-3.5" /> ዳታቤዝ አውርድ (Download)
            </button>
            {activeSubTab === 'roster' ? (
              <button
                onClick={handleDirectRosterPrint}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md"
                title="Directly Print and Download the Roster as A4 Landscape PDF"
              >
                <Printer className="w-4 h-4 animate-pulse" /> print Roster (ሮስተር አትም)
              </button>
            ) : (
              <button
                onClick={() => { playInteractiveSound('click'); setIsPrintPreview(true); }}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-indigo-100"
                title="Open printable sheet preview"
              >
                <Printer className="w-3.5 h-3.5" /> ሪፖርት አትም (Print)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Term/Period Selector Bar */}
      {(activeSubTab === 'marklist' || activeSubTab === 'roster') && (
        <div className="bg-stone-50 border border-stone-200/60 p-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-extrabold text-[11px] uppercase ml-1.5 flex items-center gap-1">
              <span className="text-sm">📅</span> የምዘና የጊዜ ዑደት (Evaluation Term):
            </span>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-bold">
              {(schoolConfig?.evaluationMode || 'quarter') === 'semester' ? 'ሴሚስተር ሞድ (Semester Mode)' : 'ሩብ ዓመት ሞድ (Quarter Mode)'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {(schoolConfig?.evaluationMode || 'quarter') === 'semester' ? (
              <>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(1); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሴሚስተር 1 (Semester 1)
                </button>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(2); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሴሚስተር 2 (Semester 2)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(1); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሩብ ዓመት 1 (Q1)
                </button>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(2); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሩብ ዓመት 2 (Q2)
                </button>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(3); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 3 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሩብ ዓመት 3 (Q3)
                </button>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setSelectedTerm(4); }}
                  className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ' + (selectedTerm === 4 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80')}
                >
                  ሩብ ዓመት 4 (Q4)
                </button>
              </>
            )}

            {/* Annual summary view toggle inside Roster only */}
            {activeSubTab === 'roster' && (
              <button
                type="button"
                onClick={() => { playInteractiveSound('click'); setSelectedTerm('annual'); }}
                className={'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ' + (selectedTerm === 'annual' ? 'bg-stone-900 text-white border-stone-900 shadow-xs' : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/80')}
              >
                📊 ዓመታዊ አማካይ (Annual Avg)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Data display */}
      <div className="overflow-x-auto">
        {activeSubTab === 'performance' ? (
          <PerformanceDashboard
            students={students}
            grades={grades}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
            teachers={teachers}
            schoolConfig={schoolConfig}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            activeTheme={activeTheme}
          />
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-stone-400 italic flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">🔍</span>
            {studentSearchQuery ? (
              <>
                <p className="font-bold text-stone-700">በፍለጋው መሰረት ምንም ተማሪ አልተገኘም (No matching students found)</p>
                <p className="text-xs text-stone-400">“{studentSearchQuery}” የሚለውን ቃል የሚያሟላ ተማሪ በዚህ ክፍል ውስጥ የለም።</p>
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setStudentSearchQuery(''); }}
                  className="mt-2 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all shadow-xs border border-indigo-100"
                >
                  ፍለጋውን አጽዳ (Clear Search)
                </button>
              </>
            ) : (
              <span>በዚህ ክፍል እና ሴክሽን ውስጥ የተመዘገበ ተማሪ አልተገኘም (No students in this Class & Section yet)</span>
            )}
          </div>
        ) : (
          <>
            {activeSubTab === 'marklist' && (
              <>
                {/* Bulk Actions Panel */}
                <div className="mb-4 bg-stone-50 border border-stone-200/60 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-stone-700">
                    <span className="text-base">⚡</span>
                    <div className="text-left">
                      <span className="font-extrabold text-xs uppercase tracking-wider block">የጅምላ ተግባራት (Bulk Actions)</span>
                      <span className="text-[10px] text-stone-400 block font-medium">ለሁሉም የክፍሉ ተማሪዎች ተፈጻሚ የሚሆን (Class-wide operations)</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {currentUserRole === 'principal' && (
                      <button
                        type="button"
                        onClick={handleBulkApproveClick}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-150/50 text-emerald-800 border border-emerald-150 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-3xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> ሁሉንም አጽድቅ (Approve All)
                      </button>
                    )}
                    {(currentUserRole === 'teacher' || currentUserRole === 'principal') && (
                      <button
                        type="button"
                        onClick={handleBulkClearClick}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-50 hover:bg-rose-150/50 text-rose-800 border border-rose-150 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-3xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> ሁሉንም ውጤት ሰርዝ (Bulk Delete Grades)
                      </button>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-stone-100">
                      <th className="p-3 w-12 text-center">ተ.ቁ (No.)</th>
                      <th className="p-3 student-name-cell">ተማሪ</th>
                      <th className="p-3 text-center">Quiz (10)</th>
                      <th className="p-3 text-center">CW (10)</th>
                      <th className="p-3 text-center">HW (10)</th>
                      <th className="p-3 text-center">Mid (20)</th>
                      <th className="p-3 text-center">Final (50)</th>
                      <th className="p-3 text-center font-bold">ጠቅላላ (Total %)</th>
                      <th className="p-3 text-center">ማረጋገጫ (Approval)</th>
                      <th className="p-3 text-center">አጥፋ (Delete)</th>
                    </tr>
                  </thead>
                <tbody>
                  {studentGradesData.map((item) => {
                    const r = item.gradeRecord;
                    const isApproved = r && r.isApproved;
                    const isEditDisabled = isApproved || !isTeachingTeacher;
                    
                    return (
                      <tr 
                        key={item.student.id} 
                        className={'border-b border-stone-100 text-stone-800 transition-all duration-200 even:bg-stone-50 ' + (isApproved ? 'bg-emerald-50/50 border-l-4 border-l-emerald-600 hover:bg-emerald-50/80' : 'hover:bg-indigo-50/10')}
                      >
                        <td className="p-3 text-center font-black text-stone-500 font-mono text-xs bg-stone-50/40">
                          {getStudentRollNumber(item.student.id)}
                        </td>
                        <td className="p-3 student-name-cell">
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{item.student.name}</span>
                            {isApproved && (
                              <span className="bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase">
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[9px] text-indigo-600 font-bold block">{item.student.id}</span>
                        </td>
                        <td className="p-3 text-center font-medium text-stone-600">
                          {editModeActive && isTeachingTeacher ? (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={r ? r.quiz : ''}
                              disabled={isEditDisabled}
                              onChange={(e) => handleInlineGradeChange(item.student.id, 'quiz', e.target.value)}
                              className="w-16 p-1 border border-stone-200 focus:border-indigo-500 rounded text-center text-xs font-bold outline-none bg-stone-50/50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          ) : (
                            r ? r.quiz : '-'
                          )}
                        </td>
                        <td className="p-3 text-center font-medium text-stone-600">
                          {editModeActive && isTeachingTeacher ? (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={r ? r.cw : ''}
                              disabled={isEditDisabled}
                              onChange={(e) => handleInlineGradeChange(item.student.id, 'cw', e.target.value)}
                              className="w-16 p-1 border border-stone-200 focus:border-indigo-500 rounded text-center text-xs font-bold outline-none bg-stone-50/50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          ) : (
                            r ? r.cw : '-'
                          )}
                        </td>
                        <td className="p-3 text-center font-medium text-stone-600">
                          {editModeActive && isTeachingTeacher ? (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={r ? r.hw : ''}
                              disabled={isEditDisabled}
                              onChange={(e) => handleInlineGradeChange(item.student.id, 'hw', e.target.value)}
                              className="w-16 p-1 border border-stone-200 focus:border-indigo-500 rounded text-center text-xs font-bold outline-none bg-stone-50/50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          ) : (
                            r ? r.hw : '-'
                          )}
                        </td>
                        <td className="p-3 text-center font-medium text-stone-600">
                          {editModeActive && isTeachingTeacher ? (
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={r ? r.mid : ''}
                              disabled={isEditDisabled}
                              onChange={(e) => handleInlineGradeChange(item.student.id, 'mid', e.target.value)}
                              className="w-16 p-1 border border-stone-200 focus:border-indigo-500 rounded text-center text-xs font-bold outline-none bg-stone-50/50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          ) : (
                            r ? r.mid : '-'
                          )}
                        </td>
                        <td className="p-3 text-center font-medium text-stone-600">
                          {editModeActive && isTeachingTeacher ? (
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={r ? r.final : ''}
                              disabled={isEditDisabled}
                              onChange={(e) => handleInlineGradeChange(item.student.id, 'final', e.target.value)}
                              className="w-16 p-1 border border-stone-200 focus:border-indigo-500 rounded text-center text-xs font-bold outline-none bg-stone-50/50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          ) : (
                            r ? r.final : '-'
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r ? (
                            <span className={'px-2 py-0.5 rounded text-xs font-black ' + (r.total >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : r.total >= 50 ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' : 'bg-rose-50 text-rose-800 border border-rose-100')}>
                              {r.total}%
                            </span>
                          ) : (
                            <span className="text-stone-300 text-xs italic">ውጤት አልተሞላም</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleApprove(item.student.id)}
                            disabled={currentUserRole !== 'principal'}
                            className={'px-3 py-1.5 rounded-lg text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-75 disabled:cursor-not-allowed ' + (isApproved ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' : 'bg-stone-100 hover:bg-indigo-50 text-stone-700 border border-stone-200 hover:border-indigo-300')}
                            title={currentUserRole !== 'principal' ? 'ርዕሰ መምህሩ ብቻ ናቸው ማጽደቅ የሚችሉት (Only the Principal can approve grades)' : 'ውጤቱን ለማጽደቅ ወይም ለመሰረዝ ጠቅ ያድርጉ'}
                          >
                            {isApproved ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 animate-bounce" />
                                <span>የጸደቀ (Approved)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>አጽድቅ (Approve)</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item.student.id, item.student.name, r)}
                            disabled={!r || isApproved || !isTeachingTeacher}
                            className={'p-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 mx-auto ' + (r && !isApproved && isTeachingTeacher ? 'text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 border border-stone-200 hover:border-rose-200 bg-white shadow-3xs' : 'text-stone-300 border border-stone-150 cursor-not-allowed bg-stone-50/10')}
                            title={!r ? 'ምንም ውጤት የለም (No grade record to delete)' : isApproved ? 'ውጤቱ የጸደቀ ስለሆነ መሰረዝ አይቻልም (Locked - Approved)' : !isTeachingTeacher ? 'ውጤቱን ለመሰረዝ የሚያስተምረው መምህር መሆን አለብዎት (Only the teaching teacher can delete)' : 'የተማሪውን ውጤት ሰርዝ (Delete/Clear Grade)'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}

            {activeSubTab === 'roster' && (
              // ROSTER TABLE VIEW WITH DETAILED SUBJECTS, CONDUCT, ABSENT AND REPORT CARD TRIGGER
              <div className="flex flex-col gap-6">
                {/* Header Instruction */}
                <div className="flex flex-col gap-3">
                  <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-xl text-stone-850 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs">
                    <div className="flex-1">
                      <span className="font-extrabold text-amber-800 block mb-1">💡 ፒዲኤፍ ማውረጃ መመሪያ (PDF Download Guide)፡</span>
                      በብሮውዘርዎ ወይም በiframe የደህንነት ገደብ ምክንያት <strong>"PDF አውርድ"</strong> በቀጥታ ካልሰራ፤ እባክዎ መተግበሪያውን 
                      <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="ml-1 px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-200 rounded-md font-black inline-flex items-center gap-1 transition-colors">
                        በአዲስ ታብ ለመክፈት እዚህ ይጫኑ (Open in New Tab) ↗️
                      </a>። በአዲስ ታብ ላይ ማውረድ በተሟላ ሁኔታ ይሰራል።
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-xl text-stone-700 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <span className="font-extrabold text-indigo-700 block mb-1">💡 መመሪያ (Instructions)፡</span>
                      እያንዳንዱ ተማሪ በሁሉም የትምህርት አይነቶች ያመጣው ውጤት ከ100 ተሰልቶ በዝርዝር ቀርቧል። የተማሪውን <span className="font-bold">ምግባር (Conduct)</span> እና <span className="font-bold">ቀሪ ቀናት (Absents)</span> እዚሁ ሰንጠረዥ ላይ በቀጥታ ማስተካከል ይችላሉ። እንዲሁም <span className="font-bold">"የተማሪ ካርድ" (Generate Card)</span> በመጫን የተሟላ ውጤት ካርድ ማመንጨት ይቻላል።
                      <span className="block mt-2 font-black text-emerald-700 animate-pulse">➡️ ቀሪ ቀናት (Absents) ኮለመንን ጨምሮ ሙሉውን ሮስተር ለማየት ሰንጠረዡን ወደ ቀኝ ያንሸራትቱት ወይም ያሸብልሉት (Scroll right to see all columns)。</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={handleDirectRosterPrint}
                        className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Printer className="w-4 h-4 animate-pulse" /> print Roster (ሮስተር አትም PDF)
                      </button>
                      <div className="bg-white px-3 py-2 rounded-xl border border-indigo-100 shadow-3xs text-[11px] font-black text-indigo-800 shrink-0 text-center">
                        ጠቅላላ ትምህርቶች፡ {subjects.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-100 shadow-xs">
                  <table className="w-full text-sm text-left border-collapse min-w-[1250px]">
                    <thead>
                      <tr className="bg-stone-50/80 backdrop-blur-xs text-stone-500 uppercase text-[10px] tracking-wider font-extrabold border-b border-stone-100">
                        <th className="p-3 w-12 text-center">ተ.ቁ (No.)</th>
                        <th className="p-3 min-w-[150px] student-name-cell">የተማሪ ሙሉ ስም (Student Name)</th>
                        <th className="p-3 text-center min-w-[60px]">ፆታ (Sex)</th>
                        <th className="p-3 text-center min-w-[60px]">ዕድሜ (Age)</th>
                        {subjects.map(sub => (
                          <th key={sub} className="p-3 text-center text-[10px] bg-stone-50/30">
                            {sub}
                          </th>
                        ))}
                        <th className="p-3 text-center bg-stone-50 font-bold text-indigo-900">ድምር (Total)</th>
                        <th className="p-3 text-center bg-indigo-50 text-indigo-950 font-extrabold">አማካይ (Average)</th>
                        <th className="p-3 text-center bg-stone-50 font-bold text-indigo-900 w-16">Rank (ደረጃ)</th>
                        <th className="p-3 text-center min-w-[110px]">ምግባር (Conduct)</th>
                        <th className="p-3 text-center min-w-[100px]">ቀሪ ቀናት (Absents)</th>
                        <th className="p-3 text-center">ሁኔታ (Status)</th>
                        <th className="p-3 text-center">ሪፖርት ካርድ (Report)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRosterData.map((item) => {
                        const isPass = item.average >= 50;
                        const hasAnyGrades = item.gradedCount > 0;
                        return (
                          <tr key={item.student.id} className="hover:bg-indigo-50/10 border-b border-stone-100 text-stone-800 transition-colors even:bg-stone-50">
                            {/* Sequence Number */}
                            <td className="p-3 text-center font-black text-stone-500 font-mono text-xs bg-stone-50/40">
                              {getStudentRollNumber(item.student.id)}
                            </td>
                            {/* Name & ID */}
                            <td className="p-3 student-name-cell">
                              <div className="font-bold text-stone-900">{item.student.name}</div>
                              <span className="font-mono text-[9px] text-stone-400 font-semibold block">{item.student.id}</span>
                            </td>
                            {/* Sex */}
                            <td className="p-3 text-center font-bold text-stone-700 text-xs">
                              {item.student.gender === 'Female' || item.student.gender === 'F' ? 'F' : 'M'}
                            </td>
                            {/* Age */}
                            <td className="p-3 text-center font-bold text-stone-700 text-xs font-mono">
                              {getStudentAge(item.student)}
                            </td>

                            {/* Dynamic Subject Grades list */}
                            {subjects.map(sub => {
                              const score = item.subjectGrades[sub];
                              const isAllowedUser = currentUserRole === 'teacher' || currentUserRole === 'principal';
                              const isEditable = editModeActive && currentUserRole === 'teacher' && currentTeacher !== null && currentTeacher.subjects.includes(sub) && selectedTerm !== 'annual';
                              return (
                                <td key={sub} className="p-3 text-center font-bold">
                                  {isEditable ? (
                                    <button
                                      onClick={() => handleOpenQuickEdit(item.student, sub)}
                                      className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-1 mx-auto"
                                      title="ውጤት ለማስተካከል ጠቅ ያድርጉ"
                                    >
                                      <span>{score !== null ? (score + '%') : '0%'}</span>
                                      <Edit2 className="w-3 h-3 text-indigo-500 opacity-80 shrink-0" />
                                    </button>
                                  ) : (
                                    score !== null ? (
                                      <span className={score >= 50 ? 'text-stone-700' : 'text-rose-600'}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-stone-300 italic text-[11px] font-normal">N/A</span>
                                    )
                                  )}
                                </td>
                              );
                            })}
                            
                            {/* Total Sum */}
                            <td className="p-3 text-center font-extrabold bg-stone-50/30 text-stone-900">
                              {hasAnyGrades ? item.totalSum : <span className="text-stone-300">-</span>}
                            </td>

                            {/* Average */}
                            <td className="p-3 text-center font-black bg-indigo-50/10 text-indigo-950">
                              {hasAnyGrades ? (
                                <span className="text-xs bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                  {item.average}%
                                </span>
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>

                            {/* Rank Column */}
                            <td className="p-3 text-center bg-stone-50/10">
                              {hasAnyGrades && item.rank !== null ? (
                                <span className={'inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ' + (item.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-200 shadow-xs' : item.rank === 2 ? 'bg-slate-100 text-slate-900 border border-slate-200' : item.rank === 3 ? 'bg-orange-100 text-orange-900 border border-orange-200' : 'bg-stone-50 text-stone-600')}>
                                  {item.rank}
                                </span>
                              ) : (
                                <span className="text-stone-300 font-bold">-</span>
                              )}
                            </td>

                            {/* Conduct Selection (Dropdown) */}
                            <td className="p-3 text-center">
                              <select
                                value={item.conduct}
                                disabled={currentUserRole !== 'teacher' && currentUserRole !== 'principal'}
                                onChange={(e) => handleUpdateExtraInfo(item.student.id, 'conduct', e.target.value)}
                                className="text-xs font-bold bg-white border border-stone-200 hover:border-indigo-400 rounded-lg p-1 text-center outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="A+">A+ (እጅግ በጣም ጥሩ)</option>
                                <option value="A">A (በጣም ጥሩ)</option>
                                <option value="B">B (ጥሩ)</option>
                                <option value="C">C (መካከለኛ)</option>
                                <option value="D">D (ደካማ)</option>
                              </select>
                            </td>

                            {/* Absents Counter Input */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  disabled={currentUserRole !== 'teacher' && currentUserRole !== 'principal'}
                                  onClick={() => handleUpdateExtraInfo(item.student.id, 'absent', Math.max(0, item.absent - 1))}
                                  className="w-5 h-5 bg-stone-100 text-stone-600 rounded-md flex items-center justify-center font-extrabold hover:bg-stone-200 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={currentUserRole !== 'teacher' && currentUserRole !== 'principal'}
                                  value={item.absent}
                                  onChange={(e) => handleUpdateExtraInfo(item.student.id, 'absent', parseInt(e.target.value) || 0)}
                                  className="w-10 text-center text-xs font-black bg-stone-50/50 border border-stone-200 rounded-md py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                  disabled={currentUserRole !== 'teacher' && currentUserRole !== 'principal'}
                                  onClick={() => handleUpdateExtraInfo(item.student.id, 'absent', item.absent + 1)}
                                  className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-md flex items-center justify-center font-extrabold hover:bg-indigo-100 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="p-3 text-center">
                              {hasAnyGrades ? (
                                isPass ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-full font-extrabold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> አልፏል
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 border border-rose-100 px-2.5 py-1 rounded-full font-extrabold">
                                    <XCircle className="w-3 h-3 text-rose-600" /> ወድቋል
                                  </span>
                                )
                              ) : (
                                <span className="text-stone-300 italic text-xs">ያልተሞላ</span>
                              )}
                            </td>

                            {/* Report Card Button */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  playInteractiveSound('click');
                                  setSelectedCardStudentId(item.student.id);
                                }}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg transition-colors border border-indigo-100 flex items-center gap-1 mx-auto"
                              >
                                <FileText className="w-3.5 h-3.5" /> ካርድ አውጣ (Card)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Roster Footer notes & signatures */}
                <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-6">
                  <div className="text-xs text-stone-500 space-y-1">
                    <p className="font-black text-stone-700">📌 ማስታወሻ (Note):</p>
                    <p>1. ለማለፍ የሚያስፈልገው ዝቅተኛ ውጤት 50% ነው።</p>
                    <p>2. ምግባር ከ "A" እስከ "D" ባሉ ደረጃዎች መሠረት ይመዘገባል።</p>
                    <p>3. ይህ ሰነድ በክፍሉ መምህር እና በፈታኞች ኮሚቴ ተረጋግጦ የጸደቀ ነው።</p>
                  </div>
                  
                  {/* Signatures in Roster */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-center pt-4 border-t border-stone-200 mt-4 md:mt-0">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-24 border-b border-stone-300 relative flex items-center justify-center">
                        <span className="font-serif italic text-indigo-800/80 font-semibold text-xs absolute -bottom-1">Girma_B</span>
                      </div>
                      <span className="text-stone-600 font-bold mt-1">የክፍሉ መምህር (Homeroom Teacher)</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-24 border-b border-stone-300 relative flex items-center justify-center">
                        <span className="font-serif italic text-indigo-800/80 font-semibold text-xs absolute -bottom-1">Yonas K.</span>
                      </div>
                      <span className="text-stone-600 font-bold mt-1">የኪሊክ ኮሚቴ ሰብሳቢ (Principal)</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeSubTab === 'attendance' && (
              <div className="flex flex-col gap-6">
                {/* DUAL CALENDAR DATE CONTROL BAR */}
                <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                        📅 ሲስተም አውቶማቲክ የቀን መቁጠሪያ (Dual Calendar System)
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-indigo-600" /> የእለቱ ቀን መረጃ (Selected Attendance Date)
                      </h4>
                    </div>
                    
                    {/* Gregorian Date Selector */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-stone-700 whitespace-nowrap">ቀን ይምረጡ (Select Date):</label>
                      <input 
                        type="date"
                        value={selectedDateStr}
                        onChange={(e) => {
                          playInteractiveSound('click');
                          setSelectedDateStr(e.target.value);
                        }}
                        className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-stone-50"
                      />
                    </div>
                  </div>

                  {/* Dual Calendar Display */}
                  {(() => {
                    const parsedDate = new Date(selectedDateStr + 'T12:00:00');
                    const dualDate = getFormattedDualCalendarDate(parsedDate);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
                        {/* Gregorian Card */}
                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                            G
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Gregorian Calendar (አውሮፓውያን አቆጣጠር)</p>
                            <p className="text-sm font-black text-stone-800">{dualDate.gc}</p>
                          </div>
                        </div>

                        {/* Ethiopian Card */}
                        <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-xl flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base">
                            ኢ
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Ethiopian Calendar (በኢትዮጵያ አቆጣጠር)</p>
                            <p className="text-sm font-black text-stone-900">{dualDate.ec}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* BULK ACTIONS & SUMMARY BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-stone-800 text-xs mr-1">ፈጣን ተግባራት (Bulk Actions):</span>
                    <button
                      onClick={() => {
                        playInteractiveSound('success');
                        setDailyAttendance(prev => {
                          const dayRecord = prev[selectedDateStr] || {};
                          const updatedDayRecord = { ...dayRecord };
                          let tempExtra = { ...studentExtraInfo };
                          let extraUpdated = false;

                          filteredStudents.forEach(student => {
                            const prevStatus = updatedDayRecord[student.id];
                            if (prevStatus !== 'present') {
                              updatedDayRecord[student.id] = 'present';
                              if (prevStatus === 'absent') {
                                const extra = tempExtra[student.id] || { conduct: 'A', absent: 0 };
                                tempExtra[student.id] = {
                                  ...extra,
                                  absent: Math.max(0, extra.absent - 1)
                                };
                                extraUpdated = true;
                              }
                            }
                          });

                          if (extraUpdated) {
                            setStudentExtraInfo(tempExtra);
                            localStorage.setItem('studentExtraInfo', JSON.stringify(tempExtra));
                          }

                          const updated = {
                            ...prev,
                            [selectedDateStr]: updatedDayRecord
                          };
                          localStorage.setItem('dailyAttendance', JSON.stringify(updated));
                          return updated;
                        });
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg transition-colors border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> ሁሉንም ራይ አድርግ (Mark All Present)
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('የዕለቱን የአቴንዳንስ መረጃ ማጽዳት ይፈልጋሉ? (Are you sure you want to clear attendance for this date?)')) {
                          playInteractiveSound('success');
                          setDailyAttendance(prev => {
                            const dayRecord = prev[selectedDateStr] || {};
                            let tempExtra = { ...studentExtraInfo };
                            let extraUpdated = false;

                            Object.keys(dayRecord).forEach(studentId => {
                              if (dayRecord[studentId] === 'absent') {
                                const extra = tempExtra[studentId] || { conduct: 'A', absent: 0 };
                                tempExtra[studentId] = {
                                  ...extra,
                                  absent: Math.max(0, extra.absent - 1)
                                };
                                extraUpdated = true;
                              }
                            });

                            if (extraUpdated) {
                              setStudentExtraInfo(tempExtra);
                              localStorage.setItem('studentExtraInfo', JSON.stringify(tempExtra));
                            }

                            const updated = { ...prev };
                            delete updated[selectedDateStr];
                            localStorage.setItem('dailyAttendance', JSON.stringify(updated));
                            return updated;
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black rounded-lg transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-stone-500" /> የዕለቱን መረጃ አጽዳ (Clear Day's Records)
                    </button>
                  </div>

                  {/* Summary of Today's Attendance */}
                  {(() => {
                    const dayRecord = dailyAttendance[selectedDateStr] || {};
                    let presentCount = 0;
                    let absentCount = 0;
                    let excusedCount = 0;
                    filteredStudents.forEach(s => {
                      const stat = dayRecord[s.id];
                      if (stat === 'present') presentCount++;
                      else if (stat === 'absent') absentCount++;
                      else if (stat === 'excused') excusedCount++;
                    });
                    const unmarkedCount = filteredStudents.length - (presentCount + absentCount + excusedCount);

                    return (
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-black text-stone-600 bg-white px-3 py-1.5 rounded-lg border border-stone-100">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> የመጣ (Present): <span className="text-emerald-700 text-xs font-black">{presentCount}</span></span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> የቀረ (Absent): <span className="text-rose-700 text-xs font-black">{absentCount}</span></span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> ፈቃድ (Excused): <span className="text-amber-600 text-xs font-black">{excusedCount}</span></span>
                        {unmarkedCount > 0 && (
                          <span className="flex items-center gap-1 text-stone-400 font-bold italic"><span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block"></span> ያልተሞላ (Pending): {unmarkedCount}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                                <div className="overflow-x-auto rounded-xl border border-stone-100 shadow-xs">
                  <table className="w-full text-sm text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-extrabold border-b border-stone-100">
                        <th className="p-3 w-12 text-center">ተ.ቁ (No.)</th>
                        <th className="p-3">ID (መታወቂያ)</th>
                        <th className="p-3">የተማሪ ሙሉ ስም (Student Full Name)</th>
                        <th className="p-3 text-center">ጾታ (Gender)</th>
                        <th className="p-3 text-center">አጠቃላይ ቀሪ ቀናት (Total Absences)</th>
                        <th className="p-3 text-center">የእለቱ መከታተያ (✔ ራይ | ✘ ኤክስ | 📝 ፈቃድ)</th>
                        <th className="p-3 text-center">የእለቱ ደረጃ (Daily Status)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const extra = studentExtraInfo[student.id] || { conduct: 'A', absent: 0 };
                        const todayRecord = dailyAttendance[selectedDateStr] || {};
                        const currentStatus = todayRecord[student.id]; // undefined | 'present' | 'absent' | 'excused'

                        return (
                          <tr key={student.id} className="hover:bg-indigo-50/10 border-b border-stone-100 text-stone-800 transition-colors even:bg-stone-50">
                            <td className="p-3 text-center font-black text-stone-500 font-mono text-xs bg-stone-50/40">
                              {getStudentRollNumber(student.id)}
                            </td>
                            <td className="p-3 font-mono text-xs font-bold text-indigo-700">{student.id}</td>
                            <td className="p-3">
                              <span className="font-semibold text-stone-900 block">{student.name}</span>
                              <span className="text-[10px] text-stone-400">Grade {student.grade} - Section {student.section}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={'px-2 py-0.5 rounded text-[11px] font-bold ' + (
                                student.gender === 'M' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              )}>
                                {student.gender === 'M' ? 'ወንድ' : 'ሴት'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className={`px-2.5 py-1 rounded-full text-xs border ${
                                extra.absent > 0 ? 'bg-rose-50 text-rose-750 border-rose-100' : 'bg-stone-50 text-stone-500 border-stone-200'
                              }`}>
                                {extra.absent} ቀን ቀርቷል
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {/* PRESENT BUTTON (✔ ራይ) */}
                                <button
                                  onClick={() => {
                                    playInteractiveSound('success');
                                    handleMarkAttendance(student.id, 'present');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-black transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs scale-105 border border-emerald-500'
                                      : 'bg-stone-100 hover:bg-emerald-50 text-stone-500 hover:text-emerald-700 border border-transparent'
                                  }`}
                                  title="መጥቷል (✔ Present)"
                                >
                                  <Check className="w-4 h-4 font-extrabold" />
                                  <span>ራይ (✔)</span>
                                </button>

                                {/* ABSENT BUTTON (✘ ኤክስ) */}
                                <button
                                  onClick={() => {
                                    playInteractiveSound('wrong');
                                    handleMarkAttendance(student.id, 'absent');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-black transition-all ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-600 text-white shadow-xs scale-105 border border-rose-500'
                                      : 'bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-transparent'
                                  }`}
                                  title="ቀርቷል (✘ Absent)"
                                >
                                  <X className="w-4 h-4 font-extrabold" />
                                  <span>ኤክስ (✘)</span>
                                </button>

                                {/* EXCUSED BUTTON (📝 ፈቃድ) */}
                                <button
                                  onClick={() => {
                                    playInteractiveSound('click');
                                    handleMarkAttendance(student.id, 'excused');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-black transition-all ${
                                    currentStatus === 'excused'
                                      ? 'bg-amber-500 text-white shadow-xs scale-105 border border-amber-500'
                                      : 'bg-stone-100 hover:bg-amber-50 text-stone-500 hover:text-amber-700 border border-transparent'
                                  }`}
                                  title="ፈቃድ (📝 Excused)"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>ፈቃድ (📝)</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[11px] font-black uppercase ${
                                currentStatus === 'present' ? 'text-emerald-600' :
                                currentStatus === 'absent' ? 'text-rose-600 font-extrabold animate-pulse' :
                                currentStatus === 'excused' ? 'text-amber-600 font-extrabold' : 'text-stone-400 italic'
                              }`}>
                                {currentStatus === 'present' && '✓ የመጣ (Present)'}
                                {currentStatus === 'absent' && '✗ የቀረ (Absent)'}
                                {currentStatus === 'excused' && '✏ ፈቃድ (Excused)'}
                                {!currentStatus && 'ያልተሞላ (No Entry)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'student-registration' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Register Student Form */}
                <div className="lg:col-span-5 bg-stone-50 border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                  <div>
                    <span className="text-[10px] bg-emerald-550 text-white font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">የክፍል ኃላፊ መምህር ተግባር</span>
                    <h3 className="text-lg font-bold text-stone-900 flex items-center gap-1.5 mt-2.5">
                      <PlusCircle className="text-emerald-600 w-5 h-5" /> አዲስ ተማሪ ይመዝግቡ (Class Register)
                    </h3>
                    <p className="text-stone-400 text-xs mt-0.5">ክፍልዎ: {selectedGrade} - ሴክሽን {selectedSection}</p>
                  </div>

                  {regSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold rounded-xl animate-pulse">
                      {regSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleRegisterStudent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የተማሪው ሙሉ ስም (Student Full Name):</label>
                      <input 
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="መላኩ ገብሬ"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-1">ክፍል (Grade):</label>
                        <div className="w-full p-3 rounded-xl border border-stone-150 text-sm bg-stone-100 font-bold text-stone-600">
                          {selectedGrade}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-stone-400 mb-1">ሴክሽን (Sec):</label>
                        <div className="w-full p-3 rounded-xl border border-stone-150 text-sm bg-stone-100 font-bold text-stone-600">
                          {selectedSection}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ጾታ (Gender):</label>
                        <select 
                          value={newStudentGender}
                          onChange={(e) => setNewStudentGender(e.target.value as any)}
                          className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                        >
                          <option value="Male">ወንድ (M)</option>
                          <option value="Female">ሴት (F)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ዕድሜ (Age):</label>
                        <input 
                          type="number"
                          min="4"
                          max="25"
                          value={newStudentAge}
                          onChange={(e) => setNewStudentAge(e.target.value)}
                          placeholder="14"
                          className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ኢሜል (Parent Email - Optional):</label>
                      <input 
                        type="email"
                        value={newStudentParentEmail}
                        onChange={(e) => setNewStudentParentEmail(e.target.value)}
                        placeholder="parent@school.com"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-white"
                      />
                      <p className="text-[10px] text-stone-400 mt-1">ይህንን ኢሜል በመጠቀም ወላጅ ሲገባ የልጁን ውጤት ያለምንም መታወቂያ እንዲያይ ይደረጋል።</p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                    >
                      ➕ ተማሪ መዝግብ (Register Student)
                    </button>
                  </form>
                </div>

                {/* Registered Students List Table */}
                <div className="lg:col-span-7 bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-stone-100">
                    <div>
                      <h3 className="text-lg font-bold text-stone-950 flex items-center gap-1.5">
                        <Users className="text-emerald-600 w-5 h-5" /> በክፍልዎ የተመዘገቡ ተማሪዎች
                      </h3>
                      <p className="text-stone-400 text-xs mt-0.5">Students currently registered in your advisor class</p>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                      ጠቅላላ፡ {filteredStudents.length} ተማሪዎች
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-black border-b border-stone-200">
                          <th className="p-3 w-12 text-center">ተ.ቁ (No.)</th>
                          <th className="p-3">ተማሪ (Student)</th>
                          <th className="p-3 text-center">ጾታ (Gender)</th>
                          <th className="p-3">ወላጅ ኢሜል (Parent Email)</th>
                          <th className="p-3">መታወቂያ (ID)</th>
                          <th className="p-3 text-center">እርምጃዎች</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="p-3 text-center font-black text-stone-500 font-mono text-xs bg-stone-50/40">
                              {getStudentRollNumber(s.id)}
                            </td>
                            <td className="p-3 font-bold text-stone-900">{s.name}</td>
                            <td className="p-3 text-center">
                              <span className={'px-2 py-0.5 rounded text-[9px] font-bold ' + (s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700')}>
                                {s.gender === 'Male' ? 'ወንድ' : 'ሴት'}
                              </span>
                            </td>
                            <td className="p-3 text-stone-500 font-mono text-[10px]">{s.parentEmail || '-'}</td>
                            <td className="p-3 font-mono font-black text-emerald-700 tracking-wider text-[11px]">{s.id}</td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditStudent(s)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                  title="ማስተካከል (Edit)"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteStudent(s)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="ማጥፋት (Delete)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-stone-400 italic">
                              በዚህ ክፍል የተመዘገበ ተማሪ የለም (No students registered yet)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulated Parent Email Notification Outbox */}
                <div className="lg:col-span-12 mt-2">
                  <SimulatedEmailOutbox />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= STUDENT REPORT CARD POPUP MODAL ================= */}
      {selectedCardStudentId && (() => {
        const cardStudent = students.find(s => s.id === selectedCardStudentId);
        if (!cardStudent) return null;

        const rosterItem = studentRosterData.find(item => item.student.id === selectedCardStudentId) || {
          student: cardStudent,
          subjectGrades: {},
          totalSum: 0,
          gradedCount: 0,
          average: 0,
          conduct: 'A',
          absent: 0,
          rank: null
        };

        const isHonorRoll = rosterItem.average >= 90;
        const cardPass = rosterItem.average >= 50;

        const isSemester = schoolConfig?.evaluationMode === 'semester';

        const getStudentGradeForTerm = (studentId: string, sub: string, termNum: number) => {
          const g = grades.find(grade => grade.studentId === studentId && grade.subject === sub && (grade.term || 1) === termNum);
          return g ? g.total : null;
        };

        const getSubjectSem1Avg = (studentId: string, sub: string) => {
          if (isSemester) {
            return getStudentGradeForTerm(studentId, sub, 1);
          } else {
            const q1 = getStudentGradeForTerm(studentId, sub, 1);
            const q2 = getStudentGradeForTerm(studentId, sub, 2);
            if (q1 !== null && q2 !== null) return Math.round((q1 + q2) / 2);
            if (q1 !== null) return q1;
            if (q2 !== null) return q2;
            return null;
          }
        };

        const getSubjectSem2Avg = (studentId: string, sub: string) => {
          if (isSemester) {
            return getStudentGradeForTerm(studentId, sub, 2);
          } else {
            const q3 = getStudentGradeForTerm(studentId, sub, 3);
            const q4 = getStudentGradeForTerm(studentId, sub, 4);
            if (q3 !== null && q4 !== null) return Math.round((q3 + q4) / 2);
            if (q3 !== null) return q3;
            if (q4 !== null) return q4;
            return null;
          }
        };

        const getSubjectAnnualAvg = (studentId: string, sub: string) => {
          const s1 = getSubjectSem1Avg(studentId, sub);
          const s2 = getSubjectSem2Avg(studentId, sub);
          if (s1 !== null && s2 !== null) return Math.round((s1 + s2) / 2);
          if (s1 !== null) return s1;
          if (s2 !== null) return s2;
          return null;
        };

        const getStudentSem1Average = (studentId: string) => {
          let sum = 0;
          let count = 0;
          subjects.forEach(sub => {
            const val = getSubjectSem1Avg(studentId, sub);
            if (val !== null) {
              sum += val;
              count++;
            }
          });
          return count > 0 ? Math.round(sum / count) : null;
        };

        const getStudentSem2Average = (studentId: string) => {
          let sum = 0;
          let count = 0;
          subjects.forEach(sub => {
            const val = getSubjectSem2Avg(studentId, sub);
            if (val !== null) {
              sum += val;
              count++;
            }
          });
          return count > 0 ? Math.round(sum / count) : null;
        };

        const classAverageVal = studentRosterData.length > 0
          ? Math.round(studentRosterData.reduce((acc, curr) => acc + curr.average, 0) / studentRosterData.length)
          : 0;

        const getStudentSem1Rank = (studentId: string) => {
          const allAverages = students
            .filter(s => s.grade === cardStudent.grade && s.section === selectedSection)
            .map(s => ({
              id: s.id,
              avg: getStudentSem1Average(s.id)
            }))
            .filter(x => x.avg !== null) as { id: string; avg: number }[];
          
          const sorted = [...allAverages].sort((a, b) => b.avg - a.avg);
          const idx = sorted.findIndex(x => x.id === studentId);
          return idx !== -1 ? (idx + 1) : '-';
        };

        const getStudentSem2Rank = (studentId: string) => {
          const allAverages = students
            .filter(s => s.grade === cardStudent.grade && s.section === selectedSection)
            .map(s => ({
              id: s.id,
              avg: getStudentSem2Average(s.id)
            }))
            .filter(x => x.avg !== null) as { id: string; avg: number }[];
          
          const sorted = [...allAverages].sort((a, b) => b.avg - a.avg);
          const idx = sorted.findIndex(x => x.id === studentId);
          return idx !== -1 ? (idx + 1) : '-';
        };

        // Function to calculate rank for each subject dynamically based on the term
        const getSubjectRankAndTotalForTerm = (subject: string, studentId: string, term: number | 'annual') => {
          const targetGrade = cardStudent.grade;
          const classGrades = students
            .filter(s => s.grade === targetGrade && s.section === selectedSection)
            .map(s => {
              if (term === 'annual') {
                const termScores = grades
                  .filter(g => g.studentId === s.id && g.subject === subject)
                  .map(g => g.total);
                const avg = termScores.length > 0 ? Math.round(termScores.reduce((a, b) => a + b, 0) / termScores.length) : null;
                return { studentId: s.id, score: avg };
              } else {
                const g = grades.find(g => g.studentId === s.id && g.subject === subject && (g.term || 1) === term);
                return { studentId: s.id, score: g ? g.total : null };
              }
            })
            .filter(item => item.score !== null) as { studentId: string; score: number }[];

          const sorted = [...classGrades].sort((a, b) => b.score - a.score);
          const idx = sorted.findIndex(item => item.studentId === studentId);
          return {
            rank: idx !== -1 ? idx + 1 : '-',
            totalInClass: sorted.length
          };
        };

        const getStudentAverageForTerm = (studentId: string, term: number) => {
          let sum = 0;
          let count = 0;
          subjects.forEach(sub => {
            const g = grades.find(g => g.studentId === studentId && g.subject === sub && (g.term || 1) === term);
            if (g) {
              sum += g.total;
              count++;
            }
          });
          return count > 0 ? Math.round(sum / count) : null;
        };

        const getTeacherNameAndSigForSubject = (sub: string) => {
          const mapping: { [key: string]: { name: string; sig: string } } = {
            'Mathematics': { name: 'አቶ ግርማ በየነ (G. Beyene)', sig: 'Girma_B' },
            'English': { name: 'ወ/ሮ ዘነበች አበራ (Z. Abera)', sig: 'Zenebech.A' },
            'Amharic': { name: 'አቶ ተክሌ ወልዴ (T. Welde)', sig: 'Tekle_W' },
            'Science': { name: 'ዶ/ር በረከት አሰፋ (B. Assefa)', sig: 'Bereket.As' },
            'Social Studies': { name: 'ወ/ሪት አልማዝ ከበደ (A. Kebede)', sig: 'Almaz_K' },
            'Citizenship Education': { name: 'አቶ ሙሉጌታ አዱኛ (M. Adunya)', sig: 'Mulugeta.A' },
            'ICT': { name: 'አቶ ዮናስ በቀለ (Y. Bekele)', sig: 'Yonas_B' }
          };
          return mapping[sub] || { name: 'መምህር (Subject Teacher)', sig: 'Signed' };
        };

        return createPortal(
          <div id="print-report-modal" className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header Controls */}
              {isPdfDownloadPreview ? (
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 no-print">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <FileText className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm block">የሚወረደው የካርድ ቅድመ-ዕይታ (PDF Download Preview)</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">ይህ ገፅ ወደ ፒዲኤፍ የሚቀየረው ትክክለኛው የካርድ ቅጽ ነው። (Exact document view for PDF export)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {pdfError && (
                      <span className="text-rose-400 text-[11px] font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 mr-2 animate-pulse">
                        ⚠️ {pdfError}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        playInteractiveSound('click');
                        setIsPdfDownloadPreview(false);
                      }}
                      className="px-4 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 text-xs font-black rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> ወደ ኋላ ተመለስ (Back)
                    </button>
                    <button
                      disabled={isGeneratingPDF}
                      onClick={() => {
                        exportElementToPDF('report-card-print-area', 'Student_Report_' + (selectedCardStudentId || 'Card'), 'landscape');
                      }}
                      className={`px-5 py-1.5 text-white text-xs font-black rounded-lg shadow-md flex items-center gap-1.5 border border-transparent transition-all duration-300 ${
                        isGeneratingPDF 
                          ? 'bg-stone-500 cursor-not-allowed opacity-75 animate-pulse' 
                          : showPdfSuccess
                          ? 'bg-emerald-500 ring-2 ring-emerald-300 scale-105'
                          : 'bg-emerald-600 hover:bg-emerald-700 hover:border-emerald-500 active:scale-95'
                      }`}
                    >
                      {isGeneratingPDF ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          በመዘጋጀት ላይ... (Generating PDF...)
                        </>
                      ) : showPdfSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white animate-bounce" /> በተሳካ ሁኔታ ተዘጋጅቷል! (Success!)
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> ፒዲኤፉን አስቀምጥ (Save as PDF)
                        </>
                      )}
                    </button>
                    <button
                      disabled={isGeneratingPDF}
                      onClick={() => {
                        playInteractiveSound('click');
                        setSelectedCardStudentId(null);
                        setIsPdfDownloadPreview(false);
                      }}
                      className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
                        isGeneratingPDF ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex flex-col gap-2 shrink-0 no-print">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-600" />
                      <span className="font-extrabold text-stone-800 text-sm">የተማሪ ውጤት ካርድ ማመንጫ (Report Card Generator)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isGeneratingPDF}
                        onClick={() => {
                          playInteractiveSound('click');
                          setIsPdfDownloadPreview(true);
                          setPreviewViewType('card');
                        }}
                        className="px-4 py-1.5 text-white text-xs font-black rounded-lg shadow-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all duration-300"
                      >
                        <Printer className="w-3.5 h-3.5" /> ካርዱን በPDF አውርድ (Download PDF A4)
                      </button>
                      <button
                        disabled={isGeneratingPDF}
                        onClick={() => {
                          setPdfError(null);
                          playInteractiveSound('success');
                          window.print();
                        }}
                        className={`px-4 py-1.5 text-white text-xs font-black rounded-lg shadow-xs flex items-center gap-1.5 transition-all duration-300 ${
                          isGeneratingPDF 
                            ? 'bg-stone-400 cursor-not-allowed opacity-50' 
                            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5" /> ካርዱን አትም (Print Card)
                      </button>
                      <button
                        disabled={isGeneratingPDF}
                        onClick={() => {
                          playInteractiveSound('click');
                          setSelectedCardStudentId(null);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isGeneratingPDF 
                            ? 'text-stone-300 cursor-not-allowed' 
                            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200'
                        }`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-stone-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-600">ቀጥታ እይታ (Live Preview):</span>
                      <div className="inline-flex rounded-lg p-0.5 bg-stone-200/80">
                        <button
                          type="button"
                          onClick={() => { playInteractiveSound('click'); setPreviewViewType('card'); }}
                          className={`px-3 py-1.5 text-[11px] font-black rounded-md transition-all flex items-center gap-1 ${
                            previewViewType === 'card'
                              ? 'bg-white text-indigo-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-850'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" /> ካርድ (Card View)
                        </button>
                        <button
                          type="button"
                          onClick={() => { playInteractiveSound('click'); setPreviewViewType('list'); }}
                          className={`px-3 py-1.5 text-[11px] font-black rounded-md transition-all flex items-center gap-1 ${
                            previewViewType === 'list'
                              ? 'bg-white text-indigo-900 shadow-xs'
                              : 'text-stone-600 hover:text-stone-850'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" /> ዝርዝር (List View)
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 font-mono">
                      {previewViewType === 'card' ? 'A4 landscape sheet styling' : 'Scrollable item list styling'}
                    </span>
                  </div>
                  {/* Fallback Help notice box for Report Card */}
                  <div className="bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl text-stone-800 text-[11px] leading-relaxed print:hidden flex items-start gap-2 shadow-2xs mt-1.5">
                    <span className="text-sm">💡</span>
                    <div>
                      <span className="font-extrabold text-amber-950">ተግባራዊ መመሪያ (Help): </span>
                      "ካርዱን በPDF አውርድ" የሚለው ካልሰራ፣ <strong>"ካርዱን አትም" (Print)</strong> የሚለውን ተጭነው <strong>"Save as PDF"</strong> በመምረጥ ማውረድ ይችላሉ።
                    </div>
                  </div>
                  {pdfError && (
                    <div className="text-right text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 self-end animate-pulse">
                      ⚠️ {pdfError}
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable Printable Card Box */}
              <div className={`overflow-y-auto p-6 flex-1 transition-all duration-300 ${isPdfDownloadPreview ? 'bg-slate-900 scrollbar-thin' : 'bg-stone-100'}`}>
                
                {/* Print Template Wrapper */}
                <div 
                  id="report-card-print-area" 
                  className="w-full text-stone-900 font-sans select-none transition-all duration-300"
                >
                  {/* Dynamic CSS Print Stylesheet injected dynamically specifically for single A4 Landscape page fitting */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: landscape !important;
                        margin: 0 !important;
                      }
                      #root {
                        display: none !important;
                        height: 0 !important;
                        overflow: hidden !important;
                        visibility: hidden !important;
                      }
                      html, body, #print-report-modal, #print-report-modal > div, .overflow-y-auto, .flex-1 {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        display: block !important;
                        position: relative !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        border: none !important;
                        flex: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                      }
                      .no-print {
                        display: none !important;
                        visibility: hidden !important;
                      }
                      #print-report-modal {
                        z-index: 9999999 !important;
                      }
                      #report-card-print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 297mm !important;
                        height: auto !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 auto !important;
                      }
                      .report-card-page {
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                        max-width: 297mm !important;
                        height: 198mm !important; /* Perfect safe fit to avoid blank page overflow */
                        box-sizing: border-box !important;
                        padding: 6mm 8mm !important;
                        margin: 0 auto 5mm auto !important;
                        box-shadow: none !important;
                        border: 6px double #854d0e !important;
                        border-radius: 4px !important;
                        background-color: #faf8f2 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        overflow: hidden !important;
                      }
                      .report-card-page:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        margin-bottom: 0 !important;
                      }
                    }
                  `}} />

                  {/* Card View Layout Container */}
                  <div className={previewViewType === 'card' ? 'block space-y-8' : 'hidden'}>
                    
                    {/* PAGE 1: OUTER SIDE (የውጭው ገጽ - የፊትና የጀርባ ሽፋን) */}
                    <div 
                      id="report-card-print-area-front" 
                      className="report-card-page bg-[#faf8f2] p-5 md:p-6 w-full max-w-[1120px] aspect-[297/210] min-h-[792px] mx-auto shadow-2xl rounded-2xl border-4 md:border-6 border-double border-amber-800 text-stone-900 relative overflow-hidden flex flex-row gap-8 transition-all duration-300"
                    >
                      {/* Watermark Logo Backing (Cover Side only, center of right half) */}
                      <div className="absolute top-0 bottom-0 right-0 left-1/2 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
                        {schoolConfig?.logoType === 'graduation' && <GraduationCap className="w-64 h-64 text-amber-900" />}
                        {schoolConfig?.logoType === 'book' && <BookOpen className="w-64 h-64 text-amber-900" />}
                        {schoolConfig?.logoType === 'shield' && <ShieldCheck className="w-64 h-64 text-amber-900" />}
                        {schoolConfig?.logoType === 'award' && <Award className="w-64 h-64 text-amber-900" />}
                      </div>

                      {/* Left Half: BACK COVER (የጀርባ ሽፋን) */}
                      <div className="w-1/2 flex flex-col justify-between pr-4 border-r-2 border-dashed border-amber-800/30 text-stone-900 relative h-full">
                        <div className="space-y-4 text-left">
                          {/* Marking Scheme Section */}
                          <div className="border-b border-amber-800/20 pb-2">
                            <h3 className="text-[12px] font-black text-amber-900 uppercase tracking-wider font-display">
                              የውጤት መግለጫና የማርክ አሰጣጥ ደንብ
                            </h3>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wide -mt-0.5 font-mono">
                              METHOD OF MARKING & GRADING SYSTEM
                            </p>
                          </div>
                          
                          {/* Dotted leaders for official rules */}
                          <div className="border-2 border-double border-amber-800/20 p-3 bg-white/60 rounded-xl space-y-1.5 shadow-xs">
                            <div className="flex items-center justify-between text-[11px] font-black text-indigo-950">
                              <span>90% - 100%</span>
                              <span className="flex-1 border-b border-dotted border-stone-400 mx-2"></span>
                              <span className="text-emerald-850">እጅግ በጣም ጥሩ (Excellent)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black text-indigo-900">
                              <span>80% - 89%</span>
                              <span className="flex-1 border-b border-dotted border-stone-400 mx-2"></span>
                              <span className="text-indigo-850">በጣም ጥሩ (Very Good)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black text-indigo-800">
                              <span>60% - 79%</span>
                              <span className="flex-1 border-b border-dotted border-stone-400 mx-2"></span>
                              <span className="text-stone-800">ጥሩ (Good)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black text-stone-800">
                              <span>50% - 59%</span>
                              <span className="flex-1 border-b border-dotted border-stone-400 mx-2"></span>
                              <span className="text-amber-800">በቂ (Satisfactory)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black text-rose-850">
                              <span>ከ 50% በታች</span>
                              <span className="flex-1 border-b border-dotted border-stone-400 mx-2"></span>
                              <span className="text-rose-700">ዝቅተኛ (Needs Support)</span>
                            </div>
                          </div>

                          {/* Official Guidance Text inside a warning box */}
                          <div className="bg-amber-50/50 border border-amber-800/10 p-2.5 rounded-lg text-[9.5px] text-stone-750 leading-normal space-y-1 text-justify shadow-2xs">
                            <p className="font-bold">
                              ⚠️ <span className="text-amber-900">ማስታወሻ፡</span> ማንኛውም ተማሪ ዜሮ (0) ማርክ ሊሰጠው አይገባም። ምክንያቱም ተማሪው ምንም ዓይነት ሥራ አልሠራም ማለት ስለሆነ። ተማሪው በትምህርት ቀናት በሙሉ ካልተገኘና የተሰጡትንም ሥራዎች ካልሠራ "Ab" (Absent) ተብሎ ይጻፋል::
                            </p>
                            <p className="italic text-stone-500 font-bold">
                              Note: A mark Zero (0) should never be given. If a student has been absent from class for the whole period covered and has not made any of the work, they should be marked "Ab".
                            </p>
                          </div>

                          {/* Parent engagement Notice */}
                          <div className="space-y-1.5">
                            <h4 className="text-[11.5px] font-black text-amber-900 uppercase tracking-wider font-display">
                              የወላጅ/የአሳዳጊ መግለጫና ክትትል (PARENT ENGAGEMENT)
                            </h4>
                            <p className="text-[10px] text-stone-700 leading-relaxed text-justify font-bold">
                              የተማሪዎች ውጤታማነት በትምህርት ቤትና በቤት ውስጥ በሚደረግ የጋራ ጥረትና ክትትል ላይ የተመሰረተ ነው። ወላጆች የተማሪዎችን የዕለት ከዕለት የትምህርት ዝግጅት、ስነ-ምግባርና መገኘት እንዲከታተሉ በአክብሮት እናሳስባለን።
                            </p>
                            <p className="text-[9.5px] text-stone-500 leading-relaxed text-justify italic font-bold">
                              Students' success depends on the joint effort from both school and home. We kindly urge parents/guardians to regularly follow up.
                            </p>
                          </div>

                          {/* Parent Signatures Table */}
                          <div className="pt-2">
                            <table className="w-full text-[10.5px] border-collapse border border-amber-800/20 rounded-lg bg-white/40 shadow-xs">
                              <thead>
                                <tr className="bg-amber-800/10 text-stone-800 font-extrabold border-b border-amber-800/20 text-[9px] uppercase font-mono">
                                  <th className="p-1.5 border-r border-amber-800/20 text-left">ሩብ ዓመት / ሴሚስተር (Term)</th>
                                  <th className="p-1.5 border-r border-amber-800/20 text-center">የወላጅ ፊርማ (Signature)</th>
                                  <th className="p-1.5 text-center">ቀን (Date)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-amber-800/15">
                                  <td className="p-1.5 pl-2.5 font-bold text-stone-700 border-r border-amber-800/20">1ኛ ወሰነ ትምህርት (1st Semester)</td>
                                  <td className="p-1.5 border-r border-amber-800/20"></td>
                                  <td className="p-1.5"></td>
                                </tr>
                                <tr className="border-b border-amber-800/15">
                                  <td className="p-1.5 pl-2.5 font-bold text-stone-700 border-r border-amber-800/20">2ኛ ወሰነ ትምህርት (2nd Semester)</td>
                                  <td className="p-1.5 border-r border-amber-800/20"></td>
                                  <td className="p-1.5"></td>
                                </tr>
                                <tr>
                                  <td className="p-1.5 pl-2.5 font-bold text-stone-700 border-r border-amber-800/20">ዓመታዊ ማጠቃለያ (Annual Sum)</td>
                                  <td className="p-1.5 border-r border-amber-800/20"></td>
                                  <td className="p-1.5"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Footer copyright */}
                        <div className="text-center text-[9px] font-mono font-bold text-stone-400 mt-2">
                          © {schoolConfig?.nameEng || 'KIBR MIDDLE SCHOOL'} • ALL RIGHTS RESERVED
                        </div>
                      </div>

                      {/* Right Half: FRONT COVER (የፊት ገጽ) */}
                      <div className="w-1/2 flex flex-col justify-between pl-4 relative h-full text-left">
                        {/* Ribbon Banner for Outstanding Achievement */}
                        {isHonorRoll && (
                          <div className="absolute top-16 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1 rounded-full text-[9.5px] font-extrabold flex items-center gap-0.5 shadow-md uppercase tracking-wider rotate-[3deg] z-10 border border-amber-400">
                            <Sparkles className="w-3 h-3 animate-spin" /> የላቀ ውጤት (Honor Roll)
                          </div>
                        )}

                        {/* Government & School Header block with gorgeous solid-indigo banner */}
                        <div className="text-center pb-2.5 relative">
                          <div className="bg-[#0f172a] text-white p-4 rounded-xl -mx-4 -mt-5 mb-3 border-b-4 border-amber-500 relative flex flex-col items-center shadow-md">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-radial-gradient opacity-10"></div>
                            {/* Official Seal / Logo */}
                            <div className="flex items-center gap-3 relative z-10">
                              <div className="bg-white p-1 rounded-full border border-amber-400 shrink-0 shadow-sm">
                                <svg className="w-10 h-10 text-blue-900" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" fill="#0F52BA" fillOpacity="0.08"/>
                                  <path d="M12 2L14.85 8.15L21.5 9.12L16.7 13.8L17.85 20.5L12 17.25L6.15 20.5L7.3 13.8L2.5 9.12L9.15 8.15L12 2Z" fill="#FFD700" stroke="#E6B800" strokeWidth="0.4"/>
                                  <circle cx="12" cy="12" r="3" stroke="#0F52BA" strokeWidth="0.6" fill="none"/>
                                  <path d="M12 8V16M8 12H16" stroke="#0F52BA" strokeWidth="0.6"/>
                                </svg>
                              </div>
                              <div className="text-left">
                                <h3 className="text-[11.5px] font-black tracking-widest text-amber-300 leading-none">የአዲስ አበባ ከተማ አስተዳደር ትምህርት ቢሮ</h3>
                                <h4 className="text-[9px] font-black text-stone-300 tracking-wide uppercase leading-none mt-1.5 font-mono">ADDIS ABABA CITY ADMINISTRATION EDUCATION BUREAU</h4>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-0.5 mt-2">
                            <h1 className="text-xl md:text-2xl font-black text-[#1e1b4b] tracking-tight leading-none uppercase font-display">
                              {schoolConfig?.nameAmh || 'ኪብር መካከለኛ ደረጃ ትምህርት ቤት'}
                            </h1>
                            <h2 className="text-sm md:text-base font-black text-amber-800 tracking-widest uppercase mt-0.5 font-display">
                              {schoolConfig?.nameEng || 'KIBR MIDDLE SCHOOL'}
                            </h2>
                            <p className="text-[10.5px] italic text-stone-500 max-w-xs mx-auto leading-tight mt-1.5 font-bold">
                              " {schoolConfig?.mottoAmh || 'ለክህሎትና ለውጤታማነት እንተጋለን!'} " / " {schoolConfig?.mottoEng || 'Striving for Skills and Excellence'} "
                            </p>
                          </div>

                          {/* Dynamic Report Card Type */}
                          <div className="text-center mt-3">
                            <div className="inline-block bg-[#1e1b4b] text-amber-400 px-4 py-1.5 rounded-md text-[11px] font-black tracking-widest leading-none border border-amber-600/50 font-display">
                              {(() => {
                                const gradeNumMatch = cardStudent.grade.match(/\d+/);
                                const gradeNum = gradeNumMatch ? parseInt(gradeNumMatch[0]) : 7;
                                if (gradeNum >= 1 && gradeNum <= 6) {
                                  return 'የአንደኛ ደረጃ ትምህርት ቤት (1-6) የተማሪ ውጤት መግለጫ • PRIMARY SCHOOL REPORT CARD';
                                } else if (gradeNum >= 7 && gradeNum <= 8) {
                                  return 'የመካከለኛ ደረጃ ትምህርት ቤት (7-8) የተማሪ ውጤት መግለጫ • MIDDLE SCHOOL REPORT CARD';
                                } else {
                                  return 'የሁለተኛ ደረጃ ትምህርት ቤት (9-12) የተማሪ ውጤት መግለጫ • HIGH SCHOOL REPORT CARD';
                                }
                              })()}
                            </div>
                          </div>

                          {/* Location & Program */}
                          <div className="grid grid-cols-3 gap-2.5 text-[10px] border-b border-amber-800/10 pb-2 mt-4 font-bold text-left">
                            <div className="flex items-center gap-1">
                              <span className="text-[#854d0e] shrink-0 font-bold">ክ/ከተማ (Sub-City):</span>
                              <span className="border-b border-dashed border-stone-400 flex-1 text-center font-serif font-black text-indigo-900 italic">ኮልፌ ቀራኒዮ</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[#854d0e] shrink-0 font-bold">ወረዳ (Woreda):</span>
                              <span className="border-b border-dashed border-stone-400 flex-1 text-center font-serif font-black text-indigo-900 italic">05</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[#854d0e] shrink-0 font-bold">መርሃ ግብር (Program):</span>
                              <span className="border-b border-dashed border-stone-400 flex-1 text-center font-serif font-black text-indigo-900 italic">መደበኛ (Regular)</span>
                            </div>
                          </div>
                        </div>

                        {/* Student Biography Info & Portrait box */}
                        <div className="flex gap-4 bg-[#fdfcf7] p-3 rounded-lg border border-[#e4dcbf] text-[11px] relative mt-1.5 shrink-0 shadow-xs">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#854d0e] rounded-l"></div>
                          
                          {/* Profile Fields */}
                          <div className="flex-1 space-y-2.5">
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-1">
                              <span className="text-[#854d0e] text-[9.5px] font-black uppercase tracking-wider shrink-0">የተማሪው ስም / Name:</span>
                              <strong className="text-[#1e1b4b] font-black text-[13px] flex-1">{cardStudent.name}</strong>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1 border-b border-stone-100 pb-1">
                                <span className="text-[#854d0e] text-[9.5px] font-black uppercase tracking-wider shrink-0">ID:</span>
                                <strong className="text-stone-950 font-mono font-black text-[11px]">{cardStudent.id}</strong>
                              </div>
                              <div className="flex items-center gap-1 border-b border-stone-100 pb-1">
                                <span className="text-[#854d0e] text-[9.5px] font-black uppercase tracking-wider shrink-0">Sex:</span>
                                <strong className="text-stone-950 font-black text-[10.5px]">
                                  {(cardStudent.gender === 'Female' || cardStudent.gender === 'F') ? 'ሴት (F)' : 'ወንድ (M)'}
                                </strong>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1 border-b border-stone-100 pb-1">
                                <span className="text-[#854d0e] text-[9.5px] font-black uppercase tracking-wider shrink-0">ክፍል (Grade):</span>
                                <strong className="text-[#1e1b4b] font-black text-[11px]">{cardStudent.grade} - {cardStudent.section}</strong>
                              </div>
                              <div className="flex items-center gap-1 border-b border-stone-100 pb-1">
                                <span className="text-[#854d0e] text-[9.5px] font-black uppercase tracking-wider shrink-0">ዘመን (Year):</span>
                                <strong className="text-stone-950 font-black text-[10.5px]">2018 ዓ.ም (2025/26)</strong>
                              </div>
                            </div>
                          </div>

                          {/* Student Portrait Placeholder */}
                          <div className="w-18 h-22 bg-stone-100 border border-stone-200 rounded flex flex-col items-center justify-center p-1 relative shrink-0">
                            <div className="absolute inset-0.5 border border-dashed border-stone-300 rounded-sm"></div>
                            <Users className="w-7 h-7 text-stone-400" />
                            <span className="text-[8px] text-stone-500 text-center font-bold mt-1 leading-none">የተማሪው ፎቶ<br/>(Photo)</span>
                          </div>
                        </div>

                        {/* Authentic Diagonal Official Ink Stamp */}
                        <div className="absolute bottom-12 right-20 pointer-events-none select-none z-20">
                          {rosterItem.average >= 50 ? (
                            <div className="border-4 border-double border-blue-600 text-blue-700 font-sans font-black text-center text-[10px] tracking-wider px-3 py-1.5 rounded-lg rotate-[-12deg] bg-white/50 opacity-90 shadow-sm transform flex flex-col items-center">
                              <span className="text-[13px] font-black leading-none">ያለፈ / PROMOTED</span>
                              <span className="text-[5.5px] tracking-widest mt-0.5 leading-none">OFFICIAL PASSED STAMP</span>
                            </div>
                          ) : (
                            <div className="border-4 border-double border-red-600 text-red-700 font-sans font-black text-center text-[10px] tracking-wider px-3 py-1.5 rounded-lg rotate-[-12deg] bg-white/50 opacity-90 shadow-sm transform flex flex-col items-center">
                              <span className="text-[13px] font-black leading-none">አልፏል / RETAINED</span>
                              <span className="text-[5.5px] tracking-widest mt-0.5 leading-none">OFFICIAL RETAINED STAMP</span>
                            </div>
                          )}
                        </div>

                        {/* Promoted / Detained decision footer detail */}
                        <div className="text-[9px] border-t border-amber-800/10 pt-2 flex justify-between font-bold text-stone-700">
                          <div>
                            <span>ወደ ቀጣይ ክፍል የተዛወረ/ች / Promoted to: </span>
                            <strong className="text-indigo-950 font-black border-b border-stone-400 pb-0.5 italic pl-1 text-[10px]">
                              {rosterItem.average >= 50 ? (() => {
                                const match = cardStudent.grade.match(/\d+/);
                                return match ? `Grade ${parseInt(match[0]) + 1}` : 'Next Grade';
                              })() : '___'}
                            </strong>
                          </div>
                          <div>
                            <span>ውሳኔ (Decision): </span>
                            <strong className={`font-black border-b border-stone-400 pb-0.5 italic ${rosterItem.average >= 50 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {rosterItem.average >= 50 ? 'የተዛወረ / PROMOTED' : 'አልተዛወረም / RETAINED'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Visual Page Break on Screen */}
                    <div className="no-print flex items-center justify-center gap-3 py-4">
                      <div className="h-[1px] bg-stone-300 flex-1"></div>
                      <span className="text-xs font-black text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-4 py-1 flex items-center gap-2 shadow-2xs font-display">
                        <FileText className="w-3.5 h-3.5" /> የጀርባ/የውስጥ ገጽ (Page 2: Inner Marks & Remarks)
                      </span>
                      <div className="h-[1px] bg-stone-300 flex-1"></div>
                    </div>

                    {/* PAGE 2: INNER SIDE (የውስጥ ገጽ - የማርክ ዝርዝርና አስተያየት) */}
                    <div 
                      id="report-card-print-area-back" 
                      className="report-card-page bg-[#faf8f2] p-5 md:p-6 w-full max-w-[1120px] aspect-[297/210] min-h-[792px] mx-auto shadow-2xl rounded-2xl border-4 md:border-6 border-double border-amber-800 text-stone-900 relative overflow-hidden flex flex-row gap-8 transition-all duration-300"
                    >
                      {/* Left Half: ACADEMIC MARKS LIST TABLE */}
                      <div className="w-1/2 flex flex-col justify-between pr-4 border-r-2 border-dashed border-amber-800/30 relative h-full">
                        <div className="flex-1 flex flex-col">
                          {/* Subject Marks Title */}
                          <div className="border-b border-amber-800/20 pb-1.5 mb-2 flex justify-between items-center text-left">
                            <div>
                              <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider font-display">
                                የትምህርት ዓይነቶች ውጤት ዝርዝር
                              </h3>
                              <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wide -mt-0.5 font-mono">
                                SUBJECT PERFORMANCE & MARK LIST
                              </p>
                            </div>
                            <span className="text-[8px] bg-[#1e1b4b] text-white px-2 py-0.5 rounded font-bold uppercase font-mono tracking-wider">
                              Academic Results
                            </span>
                          </div>

                          {/* SNUG HIGH CONTRAST PRINTABLE TABLE */}
                          <div className="border border-stone-300 rounded-lg overflow-hidden bg-white shadow-md">
                            <table className="w-full text-[10.5px] border-collapse text-left border-stone-300 table-layout-fixed">
                              <colgroup>
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                              </colgroup>
                              <thead>
                                <tr className="bg-[#1e1b4b] text-white font-extrabold text-[9.5px] uppercase font-mono border-b border-stone-350">
                                  <th className="p-1.5 pl-2 border-r border-stone-300/30">ትምህርት (Subject)</th>
                                  <th className="p-1.5 text-center border-r border-stone-300/30">1ኛ ወሰነ (S1)</th>
                                  <th className="p-1.5 text-center border-r border-stone-300/30">2ኛ ወሰነ (S2)</th>
                                  <th className="p-1.5 text-center border-r border-stone-300/30 bg-[#2e1065] text-amber-300 font-black">ዓመታዊ (Annual)</th>
                                  <th className="p-1.5 text-center border-r border-stone-300/30">ፊደል (Grade)</th>
                                  <th className="p-1.5 text-center border-r border-stone-300/30">ደረጃ (Rank)</th>
                                  <th className="p-1.5 text-center">ፊርማ (Sig)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subjects.map((sub, idx) => {
                                  const s1 = getSubjectSem1Avg(cardStudent.id, sub);
                                  const s2 = getSubjectSem2Avg(cardStudent.id, sub);
                                  const annual = getSubjectAnnualAvg(cardStudent.id, sub);
 
                                  const letter = annual !== null ? getLetterGrade(annual) : null;
                                  const subjectRank = annual !== null ? getSubjectRankAndTotalForTerm(sub, cardStudent.id, 'annual') : null;
                                  const teachDetails = getTeacherNameAndSigForSubject(sub);
 
                                  return (
                                    <tr key={sub} className={`border-b border-stone-250 hover:bg-[#faf6e9] transition-colors text-[10.5px] ${idx % 2 === 1 ? 'bg-[#faf8f2]/30' : 'bg-white'}`}>
                                      <td className="p-1.5 pl-2 font-black text-stone-900 border-r border-stone-200 max-w-[120px] truncate">
                                        {sub}
                                      </td>
                                      <td className="p-1.5 text-center font-bold border-r border-stone-200 text-stone-700">
                                        {s1 !== null ? (s1 + '%') : <span className="text-stone-300 font-normal">-</span>}
                                      </td>
                                      <td className="p-1.5 text-center font-bold border-r border-stone-200 text-stone-700">
                                        {s2 !== null ? (s2 + '%') : <span className="text-stone-300 font-normal">-</span>}
                                      </td>
                                      <td className="p-1.5 text-center font-black border-r border-stone-200 bg-amber-500/10 text-amber-950">
                                        {annual !== null ? (annual + '%') : <span className="text-stone-300 font-normal">-</span>}
                                      </td>
                                      <td className="p-1.5 text-center border-r border-stone-200 font-black">
                                        {letter ? (
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-extrabold border leading-none ${letter.color}`}>
                                            {letter.grade}
                                          </span>
                                        ) : '-'}
                                      </td>
                                      <td className="p-1.5 text-center border-r border-stone-200 font-black text-indigo-900">
                                        {subjectRank ? (subjectRank.rank + ' / ' + subjectRank.totalInClass) : '-'}
                                      </td>
                                      <td className="p-1.5 text-center text-[9.5px] font-serif italic text-indigo-800 font-black">
                                        {annual !== null ? teachDetails.sig : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
 
                                {/* Table Summary Rows with individual clean columns (No merged cell bugs) */}
                                <tr className="bg-stone-50 border-t-2 border-stone-400 font-black text-[11px]">
                                  <td className="p-1.5 pl-2 font-black text-[#1e1b4b] border-r border-stone-200">
                                    ጠቅላላ ድምር (Total Sum)
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-stone-800">
                                    {(() => {
                                      const sum = subjects.reduce((acc, s) => acc + (getSubjectSem1Avg(cardStudent.id, s) || 0), 0);
                                      return sum > 0 ? sum : '-';
                                    })()}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-stone-800">
                                    {(() => {
                                      const sum = subjects.reduce((acc, s) => acc + (getSubjectSem2Avg(cardStudent.id, s) || 0), 0);
                                      return sum > 0 ? sum : '-';
                                    })()}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 bg-amber-100 text-amber-950 font-black">
                                    {(() => {
                                      const sum = subjects.reduce((acc, s) => acc + (getSubjectAnnualAvg(cardStudent.id, s) || 0), 0);
                                      return sum > 0 ? sum : '-';
                                    })()}
                                  </td>
                                  <td className="p-1.5 border-r border-stone-200 bg-stone-50/50"></td>
                                  <td className="p-1.5 border-r border-stone-200 bg-stone-50/50"></td>
                                  <td className="p-1.5 bg-stone-50/50"></td>
                                </tr>
 
                                <tr className="bg-stone-100 border-t border-stone-300 font-black text-[11px]">
                                  <td className="p-1.5 pl-2 font-black text-[#1e1b4b] border-r border-stone-200">
                                    አማካይ ውጤት (Average)
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-[#1e1b4b] font-black">
                                    {getStudentSem1Average(cardStudent.id) !== null ? (getStudentSem1Average(cardStudent.id) + '%') : '-'}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-[#1e1b4b] font-black">
                                    {getStudentSem2Average(cardStudent.id) !== null ? (getStudentSem2Average(cardStudent.id) + '%') : '-'}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 bg-amber-200 text-amber-950 font-black">
                                    {rosterItem.average}%
                                  </td>
                                  <td className="p-1.5 border-r border-stone-200 bg-stone-100"></td>
                                  <td className="p-1.5 border-r border-stone-200 bg-stone-100"></td>
                                  <td className="p-1.5 bg-stone-100"></td>
                                </tr>
 
                                <tr className="bg-stone-50 border-t border-stone-300 font-black text-[11px]">
                                  <td className="p-1.5 pl-2 font-black text-[#1e1b4b] border-r border-stone-200">
                                    የክፍል ደረጃ (Class Rank)
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-indigo-900">
                                    {getStudentSem1Rank(cardStudent.id) !== '-' ? `${getStudentSem1Rank(cardStudent.id)} / ${studentRosterData.length}` : '-'}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 text-indigo-900">
                                    {getStudentSem2Rank(cardStudent.id) !== '-' ? `${getStudentSem2Rank(cardStudent.id)} / ${studentRosterData.length}` : '-'}
                                  </td>
                                  <td className="p-1.5 text-center border-r border-stone-200 bg-amber-100 text-[#1e1b4b] font-black">
                                    {rosterItem.rank !== null ? `${rosterItem.rank} / ${studentRosterData.length}` : '-'}
                                  </td>
                                  <td className="p-1.5 border-r border-stone-200 bg-stone-50/50"></td>
                                  <td className="p-1.5 border-r border-stone-200 bg-[#eef2ff]/40"></td>
                                  <td className="p-1.5 bg-stone-50/50"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
 
                        {/* Brief explanation */}
                        <div className="bg-amber-50/40 border border-amber-800/10 p-2.5 rounded-lg text-[9.5px] text-stone-600 mt-2 font-bold leading-none text-center">
                          የክፍል አማካይ ውጤት (Class General Average): {classAverageVal}%
                        </div>
                      </div>

                      {/* Right Half: CONDUCTS, REMARKS, ATTENDANCE & OFFICIAL SIGNATURES */}
                      <div className="w-1/2 flex flex-col justify-between pl-4 relative h-full text-left">
                        <div className="space-y-4">
                          {/* Conduct & Behaviors block with beautifully styled letter circle badges */}
                          <div className="border border-stone-300 rounded-lg p-3 bg-white shadow-md">
                            <h4 className="text-[11px] font-black text-amber-950 uppercase mb-2 pb-1 border-b border-stone-200 flex justify-between font-display">
                              <span>🌟 ባህሪና ሥነ-ምግባር / BEHAVIORS & CONDUCTS</span>
                              <span className="text-[9.5px] text-stone-400">ግምገማ (Grade)</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                              <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                                <span className="text-stone-600 font-bold">1. ደንብ ማክበር (Obedience):</span>
                                <strong className="text-emerald-700 font-black text-xs">{rosterItem.conduct}</strong>
                              </div>
                              <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                                <span className="text-stone-600 font-bold">2. ትጋትና ንቃት (Diligence):</span>
                                <strong className="text-indigo-950 font-black text-xs">{['A+', 'A', 'B'].includes(rosterItem.conduct) ? 'A' : 'B'}</strong>
                              </div>
                              <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                                <span className="text-stone-600 font-bold">3. ንጽህና (Hygiene):</span>
                                <strong className="text-indigo-950 font-black text-xs">A</strong>
                              </div>
                              <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                                <span className="text-stone-600 font-bold">4. ትብብር (Cooperation):</span>
                                <strong className="text-indigo-950 font-black text-xs">{['A+', 'A'].includes(rosterItem.conduct) ? 'A' : 'B'}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Dashboard Card */}
                          <div className="border border-stone-300 rounded-lg p-3 bg-white shadow-md">
                            <h4 className="text-[11px] font-black text-[#1e1b4b] uppercase mb-2 pb-1 border-b border-stone-200 font-display">
                              📅 የቀሪ ቀናት ማጠቃለያ / ATTENDANCE SUMMARY
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-center text-[10.5px] bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                              <div>
                                <span className="text-stone-500 block font-bold leading-none mb-1">ጠቅላላ ቀናት (Total)</span>
                                <strong className="text-[#1e1b4b] font-black text-xs block">180 ቀናት</strong>
                              </div>
                              <div>
                                <span className="text-stone-500 block font-bold leading-none mb-1">የቀረበት ቀን (Absent)</span>
                                <strong className="text-rose-700 font-black text-xs block">{rosterItem.absent} ቀን</strong>
                              </div>
                              <div>
                                <span className="text-stone-500 block font-bold leading-none mb-1">የተገኘበት (Present)</span>
                                <strong className="text-emerald-700 font-black text-xs block">{180 - rosterItem.absent} ቀን</strong>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Handwritten Teachers Remarks (Quarterly/Semester remarks) */}
                          <div className="border border-[#e4dcbf] rounded-lg p-3 bg-[#faf8f2]/50 text-[10.5px] space-y-2.5 shadow-xs">
                            <div>
                              <p className="font-bold text-[11px] text-amber-950">የ1ኛ ወሰነ ትምህርት አስተያየት (1st Semester Remark):</p>
                              <p className="font-serif italic text-indigo-900 font-black pl-1.5 pt-0.5 leading-snug">
                                {(() => {
                                  const s1Avg = getStudentSem1Average(cardStudent.id);
                                  if (s1Avg === null) return 'ውጤት አልተመዘገበም (No Grade Registered)';
                                  if (s1Avg >= 90) return '"እጅግ በጣም ከፍተኛ ውጤት ያስመዘገበ ተማሪ ነው፤ በቀጣይም ይህንን ውጤት እንዲያስቀጥል ድጋፍ ይደረግለት።"';
                                  if (s1Avg >= 75) return '"በጣም ጥሩ ውጤት ነው፤ የበለጠ ውጤታማ እንዲሆን የየዕለት ክትትልና እገዛ ቢደረግለት ይመረጣል።"';
                                  if (s1Avg >= 50) return '"ጥሩ ማለፊያ ውጤት ነው፤ በቀጣይ ክፍለ ጊዜ ይበልጥ በትኩረት እንዲያጠና ይበረታታ።"';
                                  return '"ውጤቱን ለማሻሻል ከፍተኛ ጥረት፣ የየዕለት እገዛና ተከታታይ ክትትል ያስፈልገዋል።"';
                                })()}
                              </p>
                            </div>
                            <div className="border-t border-stone-200/50 pt-2">
                              <p className="font-bold text-[11px] text-amber-950">የ2ኛ ወሰነ ትምህርት አስተያየት (2nd Semester Remark):</p>
                              <p className="font-serif italic text-indigo-900 font-black pl-1.5 pt-0.5 leading-snug">
                                {(() => {
                                  if (rosterItem.average >= 90) return '"የላቀና እጅግ አስደሳች ውጤት ነው፤ ለነበረው ተከታታይ ትጋት ትልቅ አድናቆት ይገባዋል። በቀጣይም እንዲበረታታ።"';
                                  if (rosterItem.average >= 75) return '"አመርቂና በጣም ጥሩ ውጤት ነው፤ በቀጣዩ ክፍል ይህንን የትምህርት ስኬት አስጠብቆ እንዲቀጥል ይመረጣል።"';
                                  if (rosterItem.average >= 50) return '"ትምህርቱን በስኬት አጠናቋል፤ በቀጣይ ክፍል ውጤቱን ይበልጥ ለማሳደግ በትጋት እንዲያጠና ይመረጣል።"';
                                  return '"በሚቀጥለው ዓመት ውጤቱን ለማሻሻል ከፍተኛ ጥረት፣ የየዕለት እገዛና ተከታታይ ክትትል ያስፈልገዋል።"';
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Circular Director Official Ink Seal */}
                        <div className="absolute bottom-14 right-24 pointer-events-none select-none z-10 opacity-90">
                          <div className="relative w-22 h-22 rounded-full border-4 border-double border-blue-600 flex flex-col items-center justify-center p-1.5 text-center rotate-[-6deg] bg-blue-50/10 shrink-0 font-sans shadow-sm">
                            <div className="absolute inset-0.5 rounded-full border border-dashed border-blue-600"></div>
                            <span className="text-[6.5px] font-black uppercase text-blue-600 leading-none">{schoolConfig?.nameEng || 'KIBR SCHOOL'}</span>
                            <span className="text-[5.5px] font-bold text-blue-600 my-0.2">★ OFFICIAL ★</span>
                            <span className="text-[8px] font-black text-blue-600 tracking-widest leading-none border border-blue-600 px-1 py-0.5 rounded bg-white/50">APPROVED</span>
                            <span className="text-[6.5px] font-black text-blue-600 uppercase mt-0.5">Addis Ababa</span>
                          </div>
                        </div>

                        {/* Official Signatures footer block with double underline lines */}
                        <div className="grid grid-cols-2 gap-4 text-[10.5px] text-center border-t border-amber-800/15 pt-2.5 shrink-0">
                          <div className="flex flex-col items-center">
                            <div className="h-7 w-2/3 border-b border-stone-400 flex items-end justify-center">
                              <span className="font-serif italic text-indigo-950 font-black text-xs leading-none">Girma_B</span>
                            </div>
                            <span className="text-[11px] font-black text-stone-800 mt-1">የክፍል ኃላፊ መምህር</span>
                            <span className="text-[8.5px] text-stone-500 font-mono font-bold -mt-0.5">Home Room Teacher</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-7 w-2/3 border-b border-stone-400 flex items-end justify-center">
                              <span className="font-serif italic text-indigo-950 font-black text-xs leading-none">Yonas K.</span>
                            </div>
                            <span className="text-[11px] font-black text-stone-800 mt-1">የርዕሰ መምህር (ማህተም)</span>
                            <span className="text-[8.5px] text-stone-500 font-mono font-bold -mt-0.5">Director (Seal)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List View Layout Container */}
                  <div className={previewViewType === 'list' ? 'block' : 'hidden'}>
                    <div className="space-y-6 text-stone-800">
                      {/* List-based Header */}
                      <div className="border-b border-stone-200 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                            <Award className="w-8 h-8" />
                          </div>
                          <div>
                            <h1 className="text-xl font-black text-stone-900 leading-none">
                              {schoolConfig?.nameAmh || 'ኪብር መካከለኛ ደረጃ ትምህርት ቤት'}
                            </h1>
                            <p className="text-[10px] font-mono font-bold text-stone-400 mt-1 uppercase">
                              {schoolConfig?.nameEng || 'KIBR MIDDLE SCHOOL'}
                            </p>
                            <p className="text-xs font-semibold text-stone-500 italic mt-0.5">
                              “ {schoolConfig?.mottoAmh || 'ለክህሎትና ለውጤታማነት እንተጋለን!'} ”
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-right text-xs self-start md:self-auto">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase">የተማሪ መለያ / Student ID</span>
                          <strong className="text-stone-900 font-mono font-black text-sm">{cardStudent.id}</strong>
                        </div>
                      </div>

                      {/* Student Bio Strip */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">የተማሪው ስም (Student Name)</span>
                          <strong className="text-stone-900 font-black text-xs block mt-0.5">{cardStudent.name}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ክፍልና ደረጃ (Grade / Sec)</span>
                          <strong className="text-stone-900 font-extrabold text-xs block mt-0.5">{cardStudent.grade} - {cardStudent.section}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ክፍለ ጊዜ (Term / Year)</span>
                          <strong className="text-stone-900 font-extrabold text-xs block mt-0.5 capitalize">
                            {selectedTerm === 'annual' ? 'Annual Sum' : (selectedTerm + ' Quarter')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ውሳኔ (Result Status)</span>
                          <strong className={`font-black text-xs block mt-0.5 ${cardPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {cardPass ? '✅ PASS (ያለፈ)' : '❌ RETAINED'}
                          </strong>
                        </div>
                      </div>

                      {/* List of Subjects */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <List className="w-4 h-4 text-indigo-600" /> የትምህርት ውጤት ዝርዝር (List of Academic Achievements)
                        </h3>
                        
                        {subjects.map(sub => {
                          const scores: (number | null)[] = [];
                          if (isSemester) {
                            const s1 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 1)?.total ?? null;
                            const s2 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 2)?.total ?? null;
                            scores.push(s1, s2);
                          } else {
                            const q1 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 1)?.total ?? null;
                            const q2 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 2)?.total ?? null;
                            const q3 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 3)?.total ?? null;
                            const q4 = grades.find(g => g.studentId === cardStudent.id && g.subject === sub && (g.term || 1) === 4)?.total ?? null;
                            scores.push(q1, q2, q3, q4);
                          }

                          const validScores = scores.filter((s): s is number => s !== null);
                          const average = validScores.length > 0 ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length) : null;
                          const letter = average !== null ? getLetterGrade(average) : null;
                          const subjectRank = average !== null ? getSubjectRankAndTotalForTerm(sub, cardStudent.id, 'annual') : null;
                          const teachDetails = getTeacherNameAndSigForSubject(sub);

                          return (
                            <div key={sub} className="bg-white hover:bg-stone-50 border border-stone-200 hover:border-indigo-200 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">📖</span>
                                  <div>
                                    <strong className="text-stone-900 font-extrabold text-sm">{sub}</strong>
                                    <span className="block text-[10px] text-stone-400 font-medium">አስተማሪ፡ {teachDetails.name}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Assessment Breakdown List */}
                              <div className="flex flex-wrap gap-2.5 items-center bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-150">
                                {isSemester ? (
                                  <>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Sem 1</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[0] !== null ? `${scores[0]}%` : '-'}</strong>
                                    </div>
                                    <div className="h-6 w-px bg-stone-200"></div>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Sem 2</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[1] !== null ? `${scores[1]}%` : '-'}</strong>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Q1</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[0] !== null ? `${scores[0]}%` : '-'}</strong>
                                    </div>
                                    <div className="h-6 w-px bg-stone-200"></div>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Q2</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[1] !== null ? `${scores[1]}%` : '-'}</strong>
                                    </div>
                                    <div className="h-6 w-px bg-stone-200"></div>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Q3</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[2] !== null ? `${scores[2]}%` : '-'}</strong>
                                    </div>
                                    <div className="h-6 w-px bg-stone-200"></div>
                                    <div className="text-center px-1">
                                      <span className="text-[8px] font-bold text-stone-400 uppercase block">Q4</span>
                                      <strong className="text-stone-800 font-extrabold text-xs">{scores[3] !== null ? `${scores[3]}%` : '-'}</strong>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Subject grade outcome */}
                              <div className="flex items-center gap-3 justify-end min-w-[150px]">
                                <div className="text-right">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase block">ድምር አማካይ</span>
                                  <strong className="text-stone-900 font-black text-sm">{average !== null ? `${average}%` : '-'}</strong>
                                </div>

                                <div className="h-8 w-px bg-stone-200"></div>

                                <div className="text-center">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase block">ፊደል</span>
                                  {letter ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black border ${letter.color}`}>
                                      {letter.grade}
                                    </span>
                                  ) : '-'}
                                </div>

                                <div className="h-8 w-px bg-stone-200"></div>

                                <div className="text-center">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase block">ደረጃ</span>
                                  <strong className="text-indigo-900 font-bold text-xs block mt-0.5">
                                    {subjectRank ? `${subjectRank.rank}/${subjectRank.totalInClass}` : '-'}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Overall Metrics block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                          <h4 className="text-xs font-black text-stone-900 uppercase">የውጤት ማጠቃለያ (Metrics Summary)</h4>
                          <div className="flex justify-between text-xs py-1 border-b border-stone-150">
                            <span className="text-stone-500">ዓመታዊ አማካይ ውጤት (Annual Average):</span>
                            <strong className="text-indigo-900 font-black">{rosterItem.average}%</strong>
                          </div>
                          <div className="flex justify-between text-xs py-1 border-b border-stone-150">
                            <span className="text-stone-500">የክፍሉ አማካይ (Class Average):</span>
                            <strong className="text-stone-800 font-bold">{classAverageVal}%</strong>
                          </div>
                          <div className="flex justify-between text-xs py-1">
                            <span className="text-stone-500">አጠቃላይ ደረጃ (Annual Rank):</span>
                            <strong className="text-stone-950 font-black">{rosterItem.rank !== null ? `${rosterItem.rank} / ${studentRosterData.length}` : '-'}</strong>
                          </div>
                        </div>

                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                          <h4 className="text-xs font-black text-stone-900 uppercase">ስነ-ምግባርና መገኘት (Conduct & Attendance)</h4>
                          <div className="flex justify-between text-xs py-1 border-b border-stone-150">
                            <span className="text-stone-500">ሥነ-ምግባር ደረጃ (Conduct Grade):</span>
                            <strong className="text-emerald-700 font-black">{rosterItem.conduct}</strong>
                          </div>
                          <div className="flex justify-between text-xs py-1">
                            <span className="text-stone-500">የቀረበት ቀናት (Days Absent):</span>
                            <strong className="text-rose-700 font-black">{rosterItem.absent} ቀን (Days)</strong>
                          </div>
                        </div>
                      </div>

                      {/* Signatures Row */}
                      <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-stone-200">
                        <div className="flex flex-col items-center">
                          <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Girma_B</span>
                          <span className="text-[10px] font-bold text-stone-700 mt-1">የክፍል ኃላፊ መምህር (Homeroom Teacher)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Yonas K.</span>
                          <span className="text-[10px] font-bold text-stone-700 mt-1">የርዕሰ መምህር (Director Seal)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer Controls */}
              <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex justify-end shrink-0 no-print">
                <button
                  disabled={isGeneratingPDF}
                  onClick={() => {
                    playInteractiveSound('click');
                    setSelectedCardStudentId(null);
                  }}
                  className={`px-5 py-2 text-stone-800 text-xs font-black rounded-xl transition-colors ${
                    isGeneratingPDF 
                      ? 'bg-stone-100 text-stone-450 cursor-not-allowed' 
                      : 'bg-stone-200 hover:bg-stone-300'
                  }`}
                >
                  ይዝጉ (Close)
                </button>
              </div>

            </div>
          </div>,
          document.body
        );
      })()}

      {/* ================= ROSTER CELL QUICK BREAKDOWN EDITOR MODAL ================= */}
      {quickEditStudentId && quickEditSubject && (() => {
        const student = students.find(s => s.id === quickEditStudentId);
        if (!student) return null;

        const totalPossible = 100;
        const currentTotal = Number(quickEditQuiz || 0) + Number(quickEditCw || 0) + Number(quickEditHw || 0) + Number(quickEditMid || 0) + Number(quickEditFinal || 0);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-sm">የውጤት ማሻሻያ (Grade Breakdown)</h3>
                    <p className="text-[10px] text-stone-400 mt-0.5">Student ID: {student.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playInteractiveSound('click');
                    setQuickEditStudentId(null);
                    setQuickEditSubject(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                  <span className="text-[10px] text-indigo-700 block font-bold uppercase">የተማሪ ስምና የትምህርት አይነት</span>
                  <strong className="text-sm text-stone-950 block">{student.name}</strong>
                  <span className="text-xs text-indigo-900 font-extrabold bg-indigo-100/60 px-2 py-0.5 rounded-md inline-block mt-1">
                    📖 {quickEditSubject}
                  </span>
                </div>

                {quickEditError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-lg">
                    {quickEditError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Quiz (10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={quickEditQuiz}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.min(10, Math.max(0, Number(e.target.value)));
                        setQuickEditQuiz(val);
                      }}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Classwork (10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={quickEditCw}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.min(10, Math.max(0, Number(e.target.value)));
                        setQuickEditCw(val);
                      }}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Homework (10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={quickEditHw}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.min(10, Math.max(0, Number(e.target.value)));
                        setQuickEditHw(val);
                      }}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Mid Exam (20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={quickEditMid}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.min(20, Math.max(0, Number(e.target.value)));
                        setQuickEditMid(val);
                      }}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Final Exam (50)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={quickEditFinal}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.min(50, Math.max(0, Number(e.target.value)));
                        setQuickEditFinal(val);
                      }}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex justify-between items-center mt-2">
                  <span className="text-xs font-bold text-stone-600">ጠቅላላ ውጤት (Total Sum):</span>
                  <strong className={'text-sm font-black px-3 py-1 rounded-md ' + (
                    currentTotal >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                    currentTotal >= 50 ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                    'bg-rose-50 text-rose-800 border border-rose-100'
                  )}>
                    {currentTotal} / {totalPossible}%
                  </strong>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex gap-2 justify-end shrink-0">
                <button
                  onClick={() => {
                    playInteractiveSound('click');
                    setQuickEditStudentId(null);
                    setQuickEditSubject(null);
                  }}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all"
                >
                  ይዝጉ (Cancel)
                </button>
                <button
                  onClick={handleSaveQuickEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> መዝግብ (Save Grade)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ================= CUSTOM CONFIRMATION MODAL ================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">{confirmModal.title}</h3>
                <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wider">የማረጋገጫ መስኮት (Confirmation Request)</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                {confirmModal.description}
              </p>

              {confirmModal.type === 'bulk_clear' && (
                <div className="mt-4 p-3 bg-rose-50/55 border border-rose-100 rounded-xl text-rose-900 text-[10px] font-bold flex gap-2">
                  <span className="text-sm">⚠️</span>
                  <span>ይህ ተግባር ውጤቶችን በሙሉ የሚያጠፋ ስለሆነ በከፍተኛ ጥንቃቄ እንዲተገበር ይመከራል።</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex gap-2.5 justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  playInteractiveSound('click');
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all"
              >
                ይቅር (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className={'px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ' + (
                  confirmModal.type === 'bulk_approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                )}
              >
                {confirmModal.type === 'bulk_approve' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> አጽድቅ (Confirm Approve)
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> አጥፋ (Confirm Delete)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PDF GENERATING OVERLAY ================= */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-stone-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white/95 border border-stone-200/50 rounded-2xl p-8 max-w-sm text-center shadow-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-600 absolute animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-stone-900 text-sm">ፒዲኤፍ እየተዘጋጀ ነው...</h4>
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Generating A4 PDF Report</p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs">
              {pdfProgressMsg}
            </p>
          </div>
        </div>
      )}
      {/* Student Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex justify-between items-center">
              <span className="font-extrabold text-stone-800 text-sm font-sans">የተማሪ መረጃ ማስተካከያ (Edit Student)</span>
              <button 
                onClick={() => { playInteractiveSound('click'); setEditingStudent(null); }}
                className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditStudentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የተማሪው ሙሉ ስም (Student Full Name):</label>
                <input 
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ጾታ (Gender):</label>
                  <select 
                    value={editStudentGender}
                    onChange={(e) => setEditStudentGender(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                  >
                    <option value="Male">ወንድ (M)</option>
                    <option value="Female">ሴት (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ዕድሜ (Age):</label>
                  <input 
                    type="number"
                    min="4"
                    max="25"
                    value={editStudentAge}
                    onChange={(e) => setEditStudentAge(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                    placeholder="14"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ክፍል (Grade):</label>
                  <div className="w-full p-3 rounded-xl border border-stone-150 text-sm bg-stone-100 font-bold text-stone-500">
                    {editingStudent.grade} - {editingStudent.section}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ኢሜል (Parent Email):</label>
                <input 
                  type="email"
                  value={editStudentParentEmail}
                  onChange={(e) => setEditStudentParentEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setEditingStudent(null); }}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  ይቅር (Cancel)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  💾 አስቀምጥ (Save Changes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Delete Confirmation Warning Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-extrabold text-xs uppercase tracking-wider">የተማሪ መዝገብ ማጥፊያ ማስጠንቀቂያ</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-stone-800 text-xs font-semibold leading-relaxed">
                ⚠️ <strong className="text-rose-700">ማስጠንቀቂያ፡</strong> ተማሪ <strong className="text-stone-950 font-black">"{deletingStudent.name}"</strong>ን በቋሚነት ከሲስተሙ ማጥፋት ይፈልጋሉ?
              </p>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                ይህንን ተማሪ ሲያጠፉ የልጁ መገለጫ፣ የፈተና/የምዘና ውጤቶች፣ የአይዲ መረጃ እና የወላጅ ትስስር ከሲስተሙ ሙሉ በሙሉ ይሰረዛሉ። ይህ ተግባር ሊመለስ አይችልም።
              </p>
              
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setDeletingStudent(null); }}
                  className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  አይ፣ ይቅር (Cancel)
                </button>
                <button
                  onClick={handleDeleteStudentConfirm}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  አዎ፣ አጥፋ (Delete)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

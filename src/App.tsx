import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Search, 
  PlusCircle, 
  Save, 
  LogOut, 
  AlertTriangle, 
  Code, 
  CheckCircle, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Lock, 
  Database, 
  FileSpreadsheet, 
  Info, 
  X,
  Sparkles,
  ChevronRight,
  Copy,
  Megaphone,
  Layers,
  Award,
  Download,
  Upload,
  List,
  CalendarDays,
  Printer,
  Mail,
  Edit2,
  Trash2,
  QrCode,
  Shield,
  Monitor,
  Fingerprint,
  Globe,
  History,
  Key
} from 'lucide-react';

export interface UserAccount {
  email: string;
  phone?: string;
  password?: string;
  role: 'principal' | 'teacher' | 'parent';
  name: string;
}
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_STUDENTS, 
  INITIAL_GRADES, 
  INITIAL_TEACHERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CLASSES,
  DEFECTS_REPORT, 
  Student, 
  Grade, 
  Teacher,
  Announcement,
  ClassSetup,
  DefectDetail 
} from './schoolData';

// Modular Imports
import { playInteractiveSound } from './components/AudioEngine';
import { TeacherSection } from './components/TeacherSection';
import { ClassSetupSection } from './components/ClassSetupSection';
import { AnnouncementSection } from './components/AnnouncementSection';
import { GradeTrackerSection, getFormattedDualCalendarDate } from './components/GradeTrackerSection';
import { GradeRemindersSection } from './components/GradeRemindersSection';
import { ParentNotificationService, SimulatedEmail } from './lib/notificationService';
import { SimulatedEmailOutbox } from './components/SimulatedEmailOutbox';
import { QRScannerModal } from './components/QRScannerModal';

// PDF Export Libraries
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { applyOklchCleanup } from './lib/pdfUtils';

// Firebase Imports
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, seedFirestoreIfEmpty } from './lib/firebase';

// Helper to remove any undefined properties from objects before sending to Firestore
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanForFirestore(obj[key]);
      }
    });
    return cleaned;
  }
  return obj;
};

// Client-side JSONP-based URL shortener utilizing is.gd
const shortenUrl = (longUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'isgd_cb_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    
    (window as any)[callbackName] = (data: any) => {
      cleanup();
      if (data && data.shorturl) {
        resolve(data.shorturl);
      } else if (data && data.errormessage) {
        reject(new Error(data.errormessage));
      } else {
        reject(new Error('ተለይቶ ያልታወቀ ስህተት አጋጥሟል (Unknown shortening error)'));
      }
    };

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any)[callbackName];
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('የአውታረ መረብ ስህተት አጋጥሟል (Network error connecting to shortener)'));
    };

    script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
    document.body.appendChild(script);
  });
};

const THEMES = {
  indigo: {
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    primaryText: 'text-indigo-600',
    text: 'text-indigo-700',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-100',
    focusRing: 'focus:border-indigo-600 focus:ring-indigo-600',
    accentText: 'text-indigo-800',
    accentBg: 'bg-indigo-50/40',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    shadow: 'shadow-indigo-100',
    accentBar: 'bg-indigo-600'
  },
  emerald: {
    primary: 'bg-emerald-600 hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    text: 'text-emerald-700',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-100',
    focusRing: 'focus:border-emerald-600 focus:ring-emerald-600',
    accentText: 'text-emerald-800',
    accentBg: 'bg-emerald-50/40',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    shadow: 'shadow-emerald-100',
    accentBar: 'bg-emerald-500'
  },
  violet: {
    primary: 'bg-violet-600 hover:bg-violet-700',
    primaryText: 'text-violet-600',
    text: 'text-violet-700',
    lightBg: 'bg-violet-50',
    border: 'border-violet-100',
    focusRing: 'focus:border-violet-600 focus:ring-violet-600',
    accentText: 'text-violet-800',
    accentBg: 'bg-violet-50/40',
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    shadow: 'shadow-violet-100',
    accentBar: 'bg-violet-600'
  },
  rose: {
    primary: 'bg-rose-600 hover:bg-rose-700',
    primaryText: 'text-rose-600',
    text: 'text-rose-700',
    lightBg: 'bg-rose-50',
    border: 'border-rose-100',
    focusRing: 'focus:border-rose-600 focus:ring-rose-600',
    accentText: 'text-rose-800',
    accentBg: 'bg-rose-50/40',
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    shadow: 'shadow-rose-100',
    accentBar: 'bg-rose-500'
  },
  amber: {
    primary: 'bg-amber-600 hover:bg-amber-700',
    primaryText: 'text-amber-600',
    text: 'text-amber-700',
    lightBg: 'bg-amber-50',
    border: 'border-amber-100',
    focusRing: 'focus:border-amber-600 focus:ring-amber-600',
    accentText: 'text-amber-800',
    accentBg: 'bg-amber-50/40',
    badge: 'bg-amber-50 text-amber-900 border-amber-100',
    shadow: 'shadow-amber-100',
    accentBar: 'bg-amber-500'
  },
  slate: {
    primary: 'bg-slate-700 hover:bg-slate-800',
    primaryText: 'text-slate-700',
    text: 'text-slate-700',
    lightBg: 'bg-slate-100',
    border: 'border-slate-200',
    focusRing: 'focus:border-slate-700 focus:ring-slate-700',
    accentText: 'text-slate-800',
    accentBg: 'bg-slate-100/50',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    shadow: 'shadow-slate-100',
    accentBar: 'bg-slate-600'
  }
};

const getLetterGrade = (total: number) => {
  if (total >= 90) return { label: 'A+', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (total >= 85) return { label: 'A', color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100' };
  if (total >= 80) return { label: 'B+', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
  if (total >= 75) return { label: 'B', color: 'text-indigo-600 bg-indigo-50/50 border-indigo-100' };
  if (total >= 65) return { label: 'C+', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (total >= 60) return { label: 'C', color: 'text-amber-600 bg-amber-50/50 border-amber-100' };
  if (total >= 50) return { label: 'D', color: 'text-orange-600 bg-orange-50 border-orange-100' };
  return { label: 'F', color: 'text-rose-600 bg-rose-50 border-rose-200 font-black' };
};

export default function App() {
  const getSubjectAssessments = (subject: string) => {
    return schoolConfig?.subjectAssessments?.[subject] || (
      schoolConfig?.subjectAssessments?.['default'] || (
        schoolConfig?.subjectAssessments?.['__default__'] || [
          { id: 'quiz', name: 'ኩዊዝ', nameEng: 'Quiz', maxMark: 10 },
          { id: 'cw', name: 'ክፍል ስራ', nameEng: 'Classwork', maxMark: 10 },
          { id: 'hw', name: 'የቤት ስራ', nameEng: 'Homework', maxMark: 10 },
          { id: 'mid', name: 'ግማሽ ፈተና', nameEng: 'Mid Exam', maxMark: 20 },
          { id: 'final', name: 'ማጠቃለያ ፈተና', nameEng: 'Final Exam', maxMark: 50 },
        ]
      )
    );
  };

  // Navigation: "portal" for live system, "whitelabel" for SaaS brand setup, "report" for bug analysis
  const [activeTab, setActiveTab] = useState<'portal' | 'whitelabel' | 'report'>('portal');
  
  // Simulated Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const loggedIn = localStorage.getItem('school_is_logged_in') === 'true';
    const hasUser = localStorage.getItem('school_current_user') !== null;
    return loggedIn && hasUser;
  });
  const [emailInput, setEmailInput] = useState(() => {
    return localStorage.getItem('sec_demo_autofill_enabled') === 'true' ? '0911223344' : '';
  });
  const [passwordInput, setPasswordInput] = useState(() => {
    return localStorage.getItem('sec_demo_autofill_enabled') === 'true' ? 'Principal123' : '';
  });
  const [selectedRole, setSelectedRole] = useState<'principal' | 'teacher' | 'parent'>(() => {
    const saved = localStorage.getItem('school_selected_role');
    return (saved as any) || 'principal';
  });
  const [isDesktopAppModalOpen, setIsDesktopAppModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: 'principal' | 'teacher' | 'parent' | 'student'; studentId?: string; name?: string } | null>(() => {
    const saved = localStorage.getItem('school_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // States for dynamic User Accounts & passwords (የተጠቃሚዎች አካውንት እና ይለፍ ቃል)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [isChangingPasswordOpen, setIsChangingPasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordChangeSuccessMsg, setPasswordChangeSuccessMsg] = useState<string | null>(null);
  const [passwordChangeErrorMsg, setPasswordChangeErrorMsg] = useState<string | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedQRStudent, setSelectedQRStudent] = useState<Student | null>(null);

  // --- PRODUCTION-GRADE SECURE ENTRANCE PORTAL STATES ---
  const [isDemoAutoFillEnabled, setIsDemoAutoFillEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sec_demo_autofill_enabled') === 'true';
  });
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sec_2fa_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [isTwoFactorPending, setIsTwoFactorPending] = useState<boolean>(false);
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState<string>('');
  const [twoFactorGeneratedCode, setTwoFactorGeneratedCode] = useState<string>('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState<boolean>(false);
  const [isCaptchaRequirementActive, setIsCaptchaRequirementActive] = useState<boolean>(true);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isIpBlocked, setIsIpBlocked] = useState<boolean>(false);
  const [blockCooldownSecs, setBlockCooldownSecs] = useState<number>(0);
  const [pendingLoginUser, setPendingLoginUser] = useState<any>(null);
  const [showSecurityCenter, setShowSecurityCenter] = useState<boolean>(false);

  const formatBlockCooldownTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins > 0) {
      return `${mins} ደቂቃ ከ ${s} ሰከንድ (${mins}m ${s}s)`;
    }
    return `${s} ሰከንድ (${s}s)`;
  };

  const [securityAuditTrail, setSecurityAuditTrail] = useState<Array<{
    id: string;
    timestamp: string;
    ip: string;
    device: string;
    role: string;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | '2FA_CHALLENGE' | 'LOGOUT';
    email: string;
    location: string;
  }>>(() => {
    const saved = localStorage.getItem('sec_audit_trail');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'SEC-9082',
        timestamp: new Date(Date.now() - 3600000 * 2.5).toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' }) + ' (ከ2.5 ሰዓት በፊት)',
        ip: '197.156.124.81',
        device: 'Android Mobile - Addis Ababa (Chrome)',
        role: 'teacher',
        status: 'SUCCESS',
        email: 'teacher@school.com',
        location: 'አዲስ አበባ (Addis Ababa)'
      },
      {
        id: 'SEC-4501',
        timestamp: new Date(Date.now() - 3600000 * 12).toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' }) + ' (ትላንት ማታ)',
        ip: '197.156.92.114',
        device: 'Windows PC - Debre Markos (Chrome Desktop)',
        role: 'principal',
        status: 'SUCCESS',
        email: 'principal@school.com',
        location: 'ደብረ ማርቆስ (Debre Markos)'
      },
      {
        id: 'SEC-2231',
        timestamp: new Date(Date.now() - 3600000 * 13).toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' }) + ' (ትላንት ማታ)',
        ip: '197.156.92.114',
        device: 'Windows PC - Debre Markos (Firefox Desktop)',
        role: 'principal',
        status: 'FAILED',
        email: 'principal@school.com',
        location: 'ደብረ ማርቆስ (Debre Markos)'
      }
    ];
  });

  // Persist security logs & states
  React.useEffect(() => {
    localStorage.setItem('sec_audit_trail', JSON.stringify(securityAuditTrail));
  }, [securityAuditTrail]);

  React.useEffect(() => {
    localStorage.setItem('sec_2fa_enabled', String(isTwoFactorEnabled));
  }, [isTwoFactorEnabled]);

  // Sync login/logout state to localStorage to prevent unwanted session drops on navigation
  React.useEffect(() => {
    localStorage.setItem('school_is_logged_in', isLoggedIn ? 'true' : 'false');
    if (isLoggedIn) {
      if (currentUser) {
        localStorage.setItem('school_current_user', JSON.stringify(currentUser));
      }
      localStorage.setItem('school_selected_role', selectedRole);
    } else {
      localStorage.removeItem('school_current_user');
      localStorage.removeItem('school_selected_role');
    }
  }, [isLoggedIn, currentUser, selectedRole]);

  // Lockout rate-limit timer
  React.useEffect(() => {
    if (blockCooldownSecs > 0) {
      const interval = setInterval(() => {
        setBlockCooldownSecs(prev => {
          if (prev <= 1) {
            setIsIpBlocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [blockCooldownSecs]);

  // Logger helper
  const addSecurityLog = (email: string, role: string, status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | '2FA_CHALLENGE' | 'LOGOUT') => {
    const ips = ['197.156.124.81', '196.188.42.15', '197.156.19.143', '196.190.254.33'];
    const deviceModels = ['Chrome Desktop (Ubuntu)', 'iOS Safari (Apple)', 'Android Mobile (Samsung)', 'Edge Browser (Windows)'];
    const locations = ['አዲስ አበባ (Addis Ababa)', 'ባህር ዳር (Bahir Dar)', 'ደብረ ማርቆስ (Debre Markos)', 'ሀዋሳ (Hawassa)'];
    
    const randomIp = ips[Math.floor(Math.random() * ips.length)];
    const randomDevice = deviceModels[Math.floor(Math.random() * deviceModels.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];

    const newLog = {
      id: `SEC-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ip: randomIp,
      device: randomDevice,
      role: role || 'unknown',
      status,
      email: email || 'unknown@school.com',
      location: randomLoc
    };

    setSecurityAuditTrail(prev => [newLog, ...prev.slice(0, 19)]);
  };

  // Auto-fill credentials based on selected role tab
  React.useEffect(() => {
    if (!isLoggedIn) {
      if (isDemoAutoFillEnabled) {
        if (selectedRole === 'principal') {
          setEmailInput('0911223344');
          setPasswordInput('Principal123');
        } else if (selectedRole === 'teacher') {
          setEmailInput('0912345678');
          setPasswordInput('Teacher123');
        } else if (selectedRole === 'parent') {
          setEmailInput('0922334455');
          setPasswordInput('Parent123');
        }
      } else {
        // Do not pre-fill if demo auto-fill is disabled (highly secure mode)
        setEmailInput('');
        setPasswordInput('');
      }
    }
  }, [selectedRole, isLoggedIn, isDemoAutoFillEnabled]);

  // Dynamic School Workspace (Tenant ID) for isolating data across multiple schools
  const [schoolWorkspaceId, setSchoolWorkspaceId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchool = params.get('school');
    if (urlSchool) {
      const sanitized = urlSchool.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      localStorage.setItem('school_workspace_id', sanitized);
      return sanitized;
    }
    const saved = localStorage.getItem('school_workspace_id');
    return saved ? saved : 'kibr';
  });

  // Dynamic White-Label School Configuration (SaaS Configurator)
  const [schoolConfig, setSchoolConfig] = useState(() => {
    const saved = localStorage.getItem(`schoolConfig_${schoolWorkspaceId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.subjectAssessments && '__default__' in parsed.subjectAssessments) {
          parsed.subjectAssessments['default'] = parsed.subjectAssessments['__default__'];
          delete parsed.subjectAssessments['__default__'];
        }
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return {
      nameAmh: 'ክብር መካከለኛ ደረጃ ትምህርት ቤት',
      nameEng: 'Kibr Middle School',
      mottoAmh: 'ለክህሎትና ለውጤታማነት እንተጋለን!',
      mottoEng: 'Striving for Skills and Success!',
      phone: '0111223344',
      email: 'info@kibrschool.edu.et',
      address: 'አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)',
      logoType: 'graduation' as 'graduation' | 'book' | 'shield' | 'award',
      themeColor: 'indigo' as 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate',
      subjects: ['Mathematics', 'English', 'Amharic', 'Science', 'Social Studies'],
      evaluationMode: 'quarter' as 'quarter' | 'semester',
      schoolLevel: 'primary' as 'primary' | 'secondary'
    };
  });

  // Database States loaded from localStorage if exists with try/catch safety
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(`school_students_${schoolWorkspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_STUDENTS;
  });
  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem(`school_grades_${schoolWorkspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_GRADES;
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`school_teachers_${schoolWorkspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_TEACHERS;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(`school_announcements_${schoolWorkspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_ANNOUNCEMENTS;
  });
  const [classes, setClasses] = useState<ClassSetup[]>(() => {
    const saved = localStorage.getItem(`school_classes_${schoolWorkspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_CLASSES;
  });
  const [studentExtraInfo, setStudentExtraInfo] = useState<Record<string, { conduct: string; absent: number }>>(() => {
    const saved = localStorage.getItem(`studentExtraInfo_${schoolWorkspaceId}`);
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

  // When school workspace ID changes, reset states to the newly selected school's cache
  React.useEffect(() => {
    const cachedConfig = localStorage.getItem(`schoolConfig_${schoolWorkspaceId}`);
    if (cachedConfig) {
      try { setSchoolConfig(JSON.parse(cachedConfig)); } catch (e) {}
    } else {
      setSchoolConfig({
        nameAmh: 'ክብር መካከለኛ ደረጃ ትምህርት ቤት',
        nameEng: 'Kibr Middle School',
        mottoAmh: 'ለክህሎትና ለውጤታማነት እንተጋለን!',
        mottoEng: 'Striving for Skills and Success!',
        phone: '0111223344',
        email: 'info@kibrschool.edu.et',
        address: 'አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)',
        logoType: 'graduation',
        themeColor: 'indigo',
        subjects: ['Mathematics', 'English', 'Amharic', 'Science', 'Social Studies'],
        evaluationMode: 'quarter',
        schoolLevel: 'primary'
      });
    }

    const cachedStudents = localStorage.getItem(`school_students_${schoolWorkspaceId}`);
    setStudents(cachedStudents ? JSON.parse(cachedStudents) : INITIAL_STUDENTS);

    const cachedGrades = localStorage.getItem(`school_grades_${schoolWorkspaceId}`);
    setGrades(cachedGrades ? JSON.parse(cachedGrades) : INITIAL_GRADES);

    const cachedTeachers = localStorage.getItem(`school_teachers_${schoolWorkspaceId}`);
    setTeachers(cachedTeachers ? JSON.parse(cachedTeachers) : INITIAL_TEACHERS);

    const cachedAnnouncements = localStorage.getItem(`school_announcements_${schoolWorkspaceId}`);
    setAnnouncements(cachedAnnouncements ? JSON.parse(cachedAnnouncements) : INITIAL_ANNOUNCEMENTS);

    const cachedClasses = localStorage.getItem(`school_classes_${schoolWorkspaceId}`);
    setClasses(cachedClasses ? JSON.parse(cachedClasses) : INITIAL_CLASSES);

    const cachedExtra = localStorage.getItem(`studentExtraInfo_${schoolWorkspaceId}`);
    setStudentExtraInfo(cachedExtra ? JSON.parse(cachedExtra) : {
      'ID-4021': { conduct: 'A', absent: 2 },
      'ID-1082': { conduct: 'A', absent: 0 },
      'ID-8843': { conduct: 'B', absent: 4 },
      'ID-5531': { conduct: 'A', absent: 1 },
      'ID-9011': { conduct: 'B', absent: 3 },
      'ID-3245': { conduct: 'A+', absent: 0 }
    });
  }, [schoolWorkspaceId]);

  const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = ParentNotificationService.subscribe((emails) => {
      setSimulatedEmails(emails);
    });
    return unsubscribe;
  }, []);

  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load from Firestore on mount
  React.useEffect(() => {
    async function loadData() {
      let offlineDetected = false;
      try {
        setIsSyncing(true);
        // Seed if first time
        try {
          await seedFirestoreIfEmpty(schoolWorkspaceId, {
            students: INITIAL_STUDENTS,
            grades: INITIAL_GRADES,
            teachers: INITIAL_TEACHERS,
            announcements: INITIAL_ANNOUNCEMENTS,
            classes: INITIAL_CLASSES,
            studentExtraInfo: {
              'ID-4021': { conduct: 'A', absent: 2 },
              'ID-1082': { conduct: 'A', absent: 0 },
              'ID-8843': { conduct: 'B', absent: 4 },
              'ID-5531': { conduct: 'A', absent: 1 },
              'ID-9011': { conduct: 'B', absent: 3 },
              'ID-3245': { conduct: 'A+', absent: 0 }
            }
          });
        } catch (seedErr: any) {
          console.warn('Seeding skipped or run offline:', seedErr);
          const errMsg = seedErr?.message || String(seedErr);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load students
        try {
          const studentsSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'students'));
          const loadedStudents: Student[] = [];
          studentsSnap.forEach(doc => loadedStudents.push(doc.data() as Student));
          if (loadedStudents.length > 0) {
            setStudents(loadedStudents);
          }
        } catch (e: any) {
          console.warn('Loaded students from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load grades
        try {
          const gradesSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'grades'));
          const loadedGrades: Grade[] = [];
          gradesSnap.forEach(doc => loadedGrades.push(doc.data() as Grade));
          if (loadedGrades.length > 0) {
            setGrades(loadedGrades);
          }
        } catch (e: any) {
          console.warn('Loaded grades from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load teachers
        try {
          const teachersSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'teachers'));
          const loadedTeachers: Teacher[] = [];
          teachersSnap.forEach(doc => loadedTeachers.push(doc.data() as Teacher));
          if (loadedTeachers.length > 0) {
            setTeachers(loadedTeachers);
          }
        } catch (e: any) {
          console.warn('Loaded teachers from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load announcements
        try {
          const announcementsSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'announcements'));
          const loadedAnnouncements: Announcement[] = [];
          announcementsSnap.forEach(doc => loadedAnnouncements.push(doc.data() as Announcement));
          if (loadedAnnouncements.length > 0) {
            setAnnouncements(loadedAnnouncements);
          }
        } catch (e: any) {
          console.warn('Loaded announcements from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load classes
        try {
          const classesSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'classes'));
          const loadedClasses: ClassSetup[] = [];
          classesSnap.forEach(doc => loadedClasses.push(doc.data() as ClassSetup));
          if (loadedClasses.length > 0) {
            setClasses(loadedClasses);
          }
        } catch (e: any) {
          console.warn('Loaded classes from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load user accounts (የተጠቃሚዎች አካውንት)
        try {
          const accountsSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'userAccounts'));
          const loadedAccounts: UserAccount[] = [];
          accountsSnap.forEach(doc => {
            const acc = doc.data() as UserAccount;
            if (!acc.phone) {
              if (acc.email === 'principal@school.com') acc.phone = '0911223344';
              else if (acc.email === 'teacher@school.com') acc.phone = '0912345678';
              else if (acc.email === 'teacher2@school.com') acc.phone = '0911112222';
              else if (acc.email === 'parent@school.com') acc.phone = '0922334455';
            }
            loadedAccounts.push(acc);
          });
          if (loadedAccounts.length > 0) {
            setUserAccounts(loadedAccounts);
          } else {
            // Seed default accounts
            const initialAccountsList: UserAccount[] = [
              { email: 'principal@school.com', phone: '0911223344', password: 'Principal123', role: 'principal', name: 'ርዕሰ መምህር (Principal)' },
              { email: 'teacher@school.com', phone: '0912345678', password: 'Teacher123', role: 'teacher', name: 'መምህር ግርማ (Teacher Girma)' },
              { email: 'teacher2@school.com', phone: '0911112222', password: 'Teacher123', role: 'teacher', name: 'መምህርት ዘነበች (Teacher Zenebech)' },
              { email: 'parent@school.com', phone: '0922334455', password: 'Parent123', role: 'parent', name: 'ወላጅ (Parent)' }
            ];
            for (const acc of initialAccountsList) {
              await setDoc(doc(db, 'schools', schoolWorkspaceId, 'userAccounts', acc.email.replace(/\./g, '_')), acc);
            }
            setUserAccounts(initialAccountsList);
          }
        } catch (e: any) {
          console.warn('Loaded user accounts from local storage (offline mode)', e);
          const cachedAccounts = localStorage.getItem(`school_user_accounts_${schoolWorkspaceId}`);
          if (cachedAccounts) {
            const parsed = JSON.parse(cachedAccounts) as UserAccount[];
            const mapped = parsed.map(acc => {
              if (!acc.phone) {
                if (acc.email === 'principal@school.com') acc.phone = '0911223344';
                else if (acc.email === 'teacher@school.com') acc.phone = '0912345678';
                else if (acc.email === 'teacher2@school.com') acc.phone = '0911112222';
                else if (acc.email === 'parent@school.com') acc.phone = '0922334455';
              }
              return acc;
            });
            setUserAccounts(mapped);
          } else {
            setUserAccounts([
              { email: 'principal@school.com', phone: '0911223344', password: 'Principal123', role: 'principal', name: 'ርዕሰ መምህር (Principal)' },
              { email: 'teacher@school.com', phone: '0912345678', password: 'Teacher123', role: 'teacher', name: 'መምህር ግርማ (Teacher Girma)' },
              { email: 'teacher2@school.com', phone: '0911112222', password: 'Teacher123', role: 'teacher', name: 'መምህርት ዘነበች (Teacher Zenebech)' },
              { email: 'parent@school.com', phone: '0922334455', password: 'Parent123', role: 'parent', name: 'ወላጅ (Parent)' }
            ]);
          }
        }

        // Load config
        try {
          const configDoc = await getDoc(doc(db, 'schools', schoolWorkspaceId, 'config', 'school'));
          if (configDoc.exists()) {
            const data = configDoc.data() as any;
            if (data && data.subjectAssessments && '__default__' in data.subjectAssessments) {
              data.subjectAssessments['default'] = data.subjectAssessments['__default__'];
              delete data.subjectAssessments['__default__'];
            }
            setSchoolConfig(data);
          }
        } catch (e: any) {
          console.warn('Loaded school config from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        // Load extra info
        try {
          const extraInfoSnap = await getDocs(collection(db, 'schools', schoolWorkspaceId, 'studentExtraInfo'));
          const loadedExtraInfo: Record<string, { conduct: string; absent: number }> = {};
          extraInfoSnap.forEach(doc => {
            loadedExtraInfo[doc.id] = doc.data() as { conduct: string; absent: number };
          });
          if (Object.keys(loadedExtraInfo).length > 0) {
            setStudentExtraInfo(loadedExtraInfo);
          }
        } catch (e: any) {
          console.warn('Loaded extra student info from local cache / storage (offline mode)', e);
          const errMsg = e?.message || String(e);
          if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
            offlineDetected = true;
          }
        }

        if (offlineDetected) {
          setSyncError('offline');
        } else {
          setSyncError(null);
        }
        setIsSyncing(false);
      } catch (err: any) {
        console.error('Error loading Firestore data:', err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('Could not reach Cloud Firestore') || errMsg.includes('offline') || errMsg.includes('unavailable') || !navigator.onLine) {
          setSyncError('offline');
        } else {
          setSyncError(errMsg);
        }
        setIsSyncing(false);
      }
    }

    loadData();
  }, [schoolWorkspaceId]);

  // Keep Database States in Sync with LocalStorage and Firestore
  React.useEffect(() => {
    const key = `school_students_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldStudents: Student[] = [];
    try {
      oldStudents = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(students));

    if (!isSyncing) {
      const changed = students.filter(student => {
        const old = oldStudents.find(o => o.id === student.id);
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(student);
      });

      const deleted = oldStudents.filter(old => !students.some(s => s.id === old.id));

      changed.forEach(async (student) => {
        try {
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'students', student.id), cleanForFirestore(student));
        } catch (e) {
          console.error('Firestore save student error:', e);
        }
      });

      deleted.forEach(async (student) => {
        try {
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'students', student.id));
        } catch (e) {
          console.error('Firestore delete student error:', e);
        }
      });
    }
  }, [students, isSyncing, schoolWorkspaceId]);

  React.useEffect(() => {
    const key = `school_grades_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldGrades: Grade[] = [];
    try {
      oldGrades = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(grades));

    if (!isSyncing) {
      const changed = grades.filter(g => {
        const old = oldGrades.find(o => o.id === g.id);
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(g);
      });

      const deleted = oldGrades.filter(old => !grades.some(g => g.id === old.id));

      changed.forEach(async (g) => {
        try {
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'grades', g.id), cleanForFirestore(g));
        } catch (e) {
          console.error('Firestore save grade error:', e);
        }
      });

      deleted.forEach(async (g) => {
        try {
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'grades', g.id));
        } catch (e) {
          console.error('Firestore delete grade error:', e);
        }
      });
    }
  }, [grades, isSyncing, schoolWorkspaceId]);

  React.useEffect(() => {
    const key = `school_teachers_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldTeachers: Teacher[] = [];
    try {
      oldTeachers = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(teachers));

    if (!isSyncing) {
      const changed = teachers.filter(t => {
        const old = oldTeachers.find(o => o.id === t.id);
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(t);
      });

      const deleted = oldTeachers.filter(old => !teachers.some(t => t.id === old.id));

      changed.forEach(async (t) => {
        try {
          const docId = t.id || t.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'tch_unknown';
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'teachers', docId), cleanForFirestore(t));
        } catch (e) {
          console.error('Firestore save teacher error:', e);
        }
      });

      deleted.forEach(async (t) => {
        try {
          const docId = t.id || t.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'tch_unknown';
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'teachers', docId));
        } catch (e) {
          console.error('Firestore delete teacher error:', e);
        }
      });
    }
  }, [teachers, isSyncing, schoolWorkspaceId]);

  // Sync userAccounts with Firestore and localStorage
  React.useEffect(() => {
    const key = `school_user_accounts_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldAccounts: UserAccount[] = [];
    try {
      oldAccounts = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(userAccounts));

    if (!isSyncing && userAccounts.length > 0) {
      const changed = userAccounts.filter(acc => {
        const old = oldAccounts.find(o => o.email.toLowerCase() === acc.email.toLowerCase());
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(acc);
      });

      const deleted = oldAccounts.filter(old => !userAccounts.some(acc => acc.email.toLowerCase() === old.email.toLowerCase()));

      changed.forEach(async (acc) => {
        try {
          const docId = acc.email.replace(/\./g, '_');
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'userAccounts', docId), acc);
        } catch (e) {
          console.error('Firestore save user account error:', e);
        }
      });

      deleted.forEach(async (acc) => {
        try {
          const docId = acc.email.replace(/\./g, '_');
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'userAccounts', docId));
        } catch (e) {
          console.error('Firestore delete user account error:', e);
        }
      });
    }
  }, [userAccounts, isSyncing, schoolWorkspaceId]);

  // Auto-generate missing user accounts for newly registered teachers or parent emails
  React.useEffect(() => {
    if (isSyncing) return;

    let updated = false;
    const newAccounts = [...userAccounts];

    // Check teachers
    teachers.forEach(t => {
      if (t.email) {
        const emailClean = t.email.trim().toLowerCase();
        const exists = newAccounts.some(acc => acc.email.trim().toLowerCase() === emailClean);
        if (!exists) {
          newAccounts.push({
            email: t.email,
            password: 'Teacher123',
            role: 'teacher',
            name: t.name
          });
          updated = true;
        }
      }
    });

    // Check parents from students list
    students.forEach(s => {
      if (s.parentEmail) {
        const emailClean = s.parentEmail.trim().toLowerCase();
        const exists = newAccounts.some(acc => acc.email.trim().toLowerCase() === emailClean);
        if (!exists) {
          newAccounts.push({
            email: s.parentEmail,
            password: 'Parent123',
            role: 'parent',
            name: `${s.name} ወላጅ (Parent)`
          });
          updated = true;
        }
      }
    });

    if (updated) {
      setUserAccounts(newAccounts);
    }
  }, [teachers, students, isSyncing, userAccounts]);

  React.useEffect(() => {
    const key = `school_announcements_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldAnnouncements: Announcement[] = [];
    try {
      oldAnnouncements = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(announcements));

    if (!isSyncing) {
      const changed = announcements.filter(ann => {
        const old = oldAnnouncements.find(o => o.id === ann.id);
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(ann);
      });

      const deleted = oldAnnouncements.filter(old => !announcements.some(a => a.id === old.id));

      changed.forEach(async (ann) => {
        try {
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'announcements', ann.id), cleanForFirestore(ann));
        } catch (e) {
          console.error('Firestore save announcement error:', e);
        }
      });

      deleted.forEach(async (ann) => {
        try {
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'announcements', ann.id));
        } catch (e) {
          console.error('Firestore delete announcement error:', e);
        }
      });
    }
  }, [announcements, isSyncing, schoolWorkspaceId]);

  React.useEffect(() => {
    const key = `school_classes_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldClasses: ClassSetup[] = [];
    try {
      oldClasses = oldStr ? JSON.parse(oldStr) : [];
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(classes));

    if (!isSyncing) {
      const changed = classes.filter(cls => {
        const old = oldClasses.find(o => o.id === cls.id);
        if (!old) return true;
        return JSON.stringify(old) !== JSON.stringify(cls);
      });

      const deleted = oldClasses.filter(old => !classes.some(c => c.id === old.id));

      changed.forEach(async (cls) => {
        try {
          await setDoc(doc(db, 'schools', schoolWorkspaceId, 'classes', cls.id), cleanForFirestore(cls));
        } catch (e) {
          console.error('Firestore save class error:', e);
        }
      });

      deleted.forEach(async (cls) => {
        try {
          await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'classes', cls.id));
        } catch (e) {
          console.error('Firestore delete class error:', e);
        }
      });
    }
  }, [classes, isSyncing, schoolWorkspaceId]);

  React.useEffect(() => {
    const key = `studentExtraInfo_${schoolWorkspaceId}`;
    const oldStr = localStorage.getItem(key);
    let oldExtraInfo: Record<string, { conduct: string; absent: number }> = {};
    try {
      oldExtraInfo = oldStr ? JSON.parse(oldStr) : {};
    } catch (err) {}

    localStorage.setItem(key, JSON.stringify(studentExtraInfo));

    if (!isSyncing) {
      Object.entries(studentExtraInfo).forEach(async ([studentId, info]) => {
        const oldInfo = oldExtraInfo[studentId];
        if (!oldInfo || JSON.stringify(oldInfo) !== JSON.stringify(info)) {
          try {
            await setDoc(doc(db, 'schools', schoolWorkspaceId, 'studentExtraInfo', studentId), cleanForFirestore(info));
          } catch (e) {
            console.error('Firestore save extra info error:', e);
          }
        }
      });

      Object.keys(oldExtraInfo).forEach(async (studentId) => {
        if (!studentExtraInfo[studentId]) {
          try {
            await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'studentExtraInfo', studentId));
          } catch (e) {
            console.error('Firestore delete extra info error:', e);
          }
        }
      });
    }
  }, [studentExtraInfo, isSyncing, schoolWorkspaceId]);

  React.useEffect(() => {
    localStorage.setItem(`schoolConfig_${schoolWorkspaceId}`, JSON.stringify(schoolConfig));
    if (!isSyncing) {
      setDoc(doc(db, 'schools', schoolWorkspaceId, 'config', 'school'), cleanForFirestore(schoolConfig)).catch(e => {
         console.error('Firestore save config error:', e);
      });
    }
  }, [schoolConfig, isSyncing, schoolWorkspaceId]);

  // Active grades based on school level
  const activeGradesList = React.useMemo(() => {
    if (schoolConfig.schoolLevel === 'secondary') {
      return ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    }
    return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  }, [schoolConfig.schoolLevel]);

  // Form States: Student Registration (Principal)
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('Grade 8');
  const [newStudentSection, setNewStudentSection] = useState('A');
  const [newStudentGender, setNewStudentGender] = useState<'Male' | 'Female'>('Female');
  const [newStudentParentEmail, setNewStudentParentEmail] = useState('');
  const [newStudentParentPhone, setNewStudentParentPhone] = useState('');
  const [newStudentAge, setNewStudentAge] = useState<string>('');
  const [principalSuccessMsg, setPrincipalSuccessMsg] = useState<string | null>(null);
  const [registeredStudentFilter, setRegisteredStudentFilter] = useState<string>('all');

  // Editing Student in Student Registration tab
  const [editingStudentMainTab, setEditingStudentMainTab] = useState<Student | null>(null);
  const [editStudentMainName, setEditStudentMainName] = useState('');
  const [editStudentMainGender, setEditStudentMainGender] = useState<'Male' | 'Female'>('Female');
  const [editStudentMainGrade, setEditStudentMainGrade] = useState('');
  const [editStudentMainSection, setEditStudentMainSection] = useState('');
  const [editStudentMainAge, setEditStudentMainAge] = useState('');
  const [editStudentMainParentEmail, setEditStudentMainParentEmail] = useState('');
  const [editStudentMainParentPhone, setEditStudentMainParentPhone] = useState('');
  const [deletingStudentMainTab, setDeletingStudentMainTab] = useState<Student | null>(null);

  // Sync selected default grade & filter on schoolLevel changes
  React.useEffect(() => {
    setNewStudentGrade(schoolConfig.schoolLevel === 'secondary' ? 'Grade 9' : 'Grade 1');
    setRegisteredStudentFilter('all');
  }, [schoolConfig.schoolLevel]);

  // Principal Sub-workspaces inside Dashboard: 'students' | 'teachers' | 'classes' | 'notices' | 'gradetracker' | 'reminders'
  const [principalSubTab, setPrincipalSubTab] = useState<'students' | 'teachers' | 'classes' | 'notices' | 'gradetracker' | 'reminders'>('students');

  // Form States: Teacher grade entry
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherSubject, setSelectedTeacherSubject] = useState(schoolConfig.subjects[0] || 'Mathematics');
  const [teacherSelectedTerm, setTeacherSelectedTerm] = useState(1);
  const [quizScore, setQuizScore] = useState<number | ''>('');
  const [cwScore, setCwScore] = useState<number | ''>('');
  const [hwScore, setHwScore] = useState<number | ''>('');
  const [midScore, setMidScore] = useState<number | ''>('');
  const [finalScore, setFinalScore] = useState<number | ''>('');
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState<string | null>(null);
  const [teacherErrorMsg, setTeacherErrorMsg] = useState<string | null>(null);
  const [teacherSubTab, setTeacherSubTab] = useState<'quick-entry' | 'class-sheets'>('class-sheets');

  // Find current teacher matching logged in email
  const currentTeacher = React.useMemo(() => {
    if (currentUser?.role !== 'teacher' || !currentUser?.email || !teachers) return null;
    return teachers.find(t => t.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) || null;
  }, [currentUser, teachers]);

  // Restrict subjects the teacher teaches
  const selectableTeacherSubjects = React.useMemo(() => {
    if (currentUser?.role === 'teacher' && currentTeacher) {
      return currentTeacher.subjects;
    }
    return schoolConfig.subjects;
  }, [currentUser, currentTeacher, schoolConfig.subjects]);

  // Restrict students to teacher's class and section
  const selectableStudents = React.useMemo(() => {
    if (currentUser?.role === 'teacher' && currentTeacher) {
      if (currentTeacher.classAllocations && currentTeacher.classAllocations.length > 0) {
        return students.filter(s => 
          currentTeacher.classAllocations!.some(alloc => alloc.grade === s.grade && alloc.section === s.section)
        );
      }
      return students.filter(s => s.grade === currentTeacher.assignedClass && s.section === currentTeacher.assignedSection);
    }
    return students;
  }, [currentUser, currentTeacher, students]);

  // Sync selectedTeacherSubject with subjects changes
  React.useEffect(() => {
    if (selectableTeacherSubjects.length > 0 && !selectableTeacherSubjects.includes(selectedTeacherSubject)) {
      setSelectedTeacherSubject(selectableTeacherSubjects[0]);
    }
  }, [selectableTeacherSubjects, selectedTeacherSubject]);

  // Sync teacherSelectedTerm with evaluationMode
  React.useEffect(() => {
    const isSemester = (schoolConfig.evaluationMode || 'quarter') === 'semester';
    if (isSemester && teacherSelectedTerm > 2) {
      setTeacherSelectedTerm(1);
    }
  }, [schoolConfig.evaluationMode, teacherSelectedTerm]);

  // Form States: Parent Search
  const [searchId, setSearchId] = useState('');
  const [parentSearched, setParentSearched] = useState(false);
  const [parentErrorMsg, setParentErrorMsg] = useState<string | null>(null);
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [foundGrades, setFoundGrades] = useState<Grade[]>([]);
  const [parentSubView, setParentSubView] = useState<'grades' | 'notices' | 'attendance'>('grades');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [previewViewType, setPreviewViewType] = useState<'card' | 'list'>('card');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => (localStorage.getItem('school_theme_mode') as 'light' | 'dark') || 'dark');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloadablePdf, setDownloadablePdf] = useState<{
    url: string;
    filename: string;
    title: string;
  } | null>(null);

  const [exportingAttendanceStudent, setExportingAttendanceStudent] = useState<Student | null>(null);
  const [exportingAttendanceHistory, setExportingAttendanceHistory] = useState<any[]>([]);
  const [isExportingAttendancePDF, setIsExportingAttendancePDF] = useState(false);

  const getStudentGradeForTerm = (subject: string, termNum: number) => {
    const g = foundGrades.find(grade => grade.subject === subject && (grade.term || 1) === termNum);
    return g ? g.total : null;
  };

  const getSubjectSem1Avg = (sub: string) => {
    const isSem = (schoolConfig.evaluationMode || 'quarter') === 'semester';
    if (isSem) {
      return getStudentGradeForTerm(sub, 1);
    } else {
      const q1 = getStudentGradeForTerm(sub, 1);
      const q2 = getStudentGradeForTerm(sub, 2);
      if (q1 !== null && q2 !== null) return Math.round(((q1 + q2) / 2) * 100) / 100;
      if (q1 !== null) return q1;
      if (q2 !== null) return q2;
      return null;
    }
  };

  const getSubjectSem2Avg = (sub: string) => {
    const isSem = (schoolConfig.evaluationMode || 'quarter') === 'semester';
    if (isSem) {
      return getStudentGradeForTerm(sub, 2);
    } else {
      const q3 = getStudentGradeForTerm(sub, 3);
      const q4 = getStudentGradeForTerm(sub, 4);
      if (q3 !== null && q4 !== null) return Math.round(((q3 + q4) / 2) * 100) / 100;
      if (q3 !== null) return q3;
      if (q4 !== null) return q4;
      return null;
    }
  };

  const getSubjectAnnualAvg = (sub: string) => {
    const s1 = getSubjectSem1Avg(sub);
    const s2 = getSubjectSem2Avg(sub);
    if (s1 !== null && s2 !== null) return Math.round(((s1 + s2) / 2) * 100) / 100;
    if (s1 !== null) return s1;
    if (s2 !== null) return s2;
    return null;
  };

  // States for URL Shortener feature (አጭር ሊንክ)
  const [shortenedWorkspaceUrl, setShortenedWorkspaceUrl] = useState<string>('');
  const [isShortening, setIsShortening] = useState<boolean>(false);
  const [shortenError, setShortenError] = useState<string | null>(null);

  const handleGenerateShortLink = async () => {
    setIsShortening(true);
    setShortenError(null);
    playInteractiveSound('click');
    const longUrl = `${window.location.origin}${window.location.pathname}?school=${schoolWorkspaceId}`;
    try {
      const shortUrl = await shortenUrl(longUrl);
      setShortenedWorkspaceUrl(shortUrl);
      playInteractiveSound('success');
    } catch (err: any) {
      console.error("Shortening error:", err);
      setShortenError(err?.message || "ሊንኩን ማሳጠር አልተቻለም (Could not shorten link)");
      playInteractiveSound('wrong');
    } finally {
      setIsShortening(false);
    }
  };

  const handleExportPDF = async () => {
    if (!foundStudent) return;
    
    // Apply oklch/oklab cleanup to document before calling html2canvas
    let cleanupContext: any = null;
    try {
      playInteractiveSound('click');
      setIsExportingPDF(true);
      setPdfError(null);
      
      const element = document.getElementById('print-target-sheet');
      if (!element) {
        setPdfError('የውጤት መግለጫ ካርዱ አልተገኘም። (Report card sheet not found.)');
        setIsExportingPDF(false);
        return;
      }

      cleanupContext = applyOklchCleanup(document, window);

      // Capture element with html2canvas (scale 2x for sharp print quality)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
          if (cleanupContext) {
            cleanupContext.handleClone(clonedDoc, 'print-target-sheet');
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      // jsPDF portrait A4 layout
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const marginX = 12;
      const imgWidth = pdfWidth - (marginX * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const marginY = Math.max(12, (pdfHeight - imgHeight) / 2);

      pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);

      // Add a subtle, school-branded watermark across the center of the generated PDF for enhanced authenticity
      try {
        pdf.saveGraphicsState();
        pdf.setTextColor(225, 225, 225); // Very light gray, perfectly ink-safe and readable
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(24);
        const watermarkText = schoolConfig?.nameEng || "KIBR MIDDLE SCHOOL";
        pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
          align: 'center',
          angle: 45
        });
        pdf.restoreGraphicsState();
      } catch (e) {
        // Fallback if saveGraphicsState is not supported in the active pdf instance
        pdf.setTextColor(235, 235, 235);
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(24);
        const watermarkText = schoolConfig?.nameEng || "KIBR MIDDLE SCHOOL";
        pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
          align: 'center',
          angle: 45
        });
      }
      
      const safeName = foundStudent.name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
      const filename = `Kibr_Report_Card_${safeName}_${foundStudent.id}.pdf`;

      // Try automatic save
      try {
        pdf.save(filename);
      } catch (saveErr) {
        console.warn('Standard PDF save failed inside iframe', saveErr);
      }

      // Generate secure Blob URL for manual click download fallback
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setDownloadablePdf({
        url: blobUrl,
        filename,
        title: `የተማሪ ${foundStudent.name} ሪፖርት ካርድ (Report Card)`
      });

      setIsExportingPDF(false);
    } catch (err: any) {
      console.error('PDF generation failure:', err);
      setPdfError(err?.message || 'ፒዲኤፍ ማውረድ አልተቻለም። (Failed to generate PDF document.)');
      setIsExportingPDF(false);
    } finally {
      if (cleanupContext) {
        cleanupContext.restoreAll();
      }
    }
  };

  const handleExportAttendancePDF = async (student: Student, history: any[]) => {
    if (!student || history.length === 0) return;
    try {
      playInteractiveSound('click');
      setExportingAttendanceStudent(student);
      setExportingAttendanceHistory(history);
      setIsExportingAttendancePDF(true);

      // Wait a bit for React to render the offscreen target
      await new Promise((resolve) => setTimeout(resolve, 400));

      const element = document.getElementById('attendance-print-target');
      if (!element) {
        throw new Error('የአቴንዳንስ ሪፖርት ማተሚያ ክፍል አልተገኘም። (Attendance print target not found.)');
      }

      const cleanupContext = applyOklchCleanup(document, window);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const imgWidth = pdfWidth - (marginX * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pdfHeight - 20) {
        let heightLeft = imgHeight;
        let position = 10;
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      } else {
        const marginY = Math.max(12, (pdfHeight - imgHeight) / 2);
        pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
      }

      if (cleanupContext) {
        cleanupContext.restoreAll();
      }

      const safeName = student.name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
      const filename = `Kibr_Attendance_${safeName}_${student.id}.pdf`;

      // Try automatic save
      try {
        pdf.save(filename);
      } catch (saveErr) {
        console.warn('Standard Attendance PDF save failed inside iframe', saveErr);
      }

      // Generate secure Blob URL for manual click download fallback
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setDownloadablePdf({
        url: blobUrl,
        filename,
        title: `የተማሪ ${student.name} የክትትል ሪፖርት (Attendance Record)`
      });
    } catch (err) {
      console.error('Attendance PDF export error:', err);
      alert('📌 ፒዲኤፍ ለማውረድ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsExportingAttendancePDF(false);
      setExportingAttendanceStudent(null);
      setExportingAttendanceHistory([]);
    }
  };

  // Selected Defect detail for overlay modal
  const [selectedDefect, setSelectedDefect] = useState<DefectDetail | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form States: SaaS Brand Setup
  const [tempWorkspaceId, setTempWorkspaceId] = useState(schoolWorkspaceId);
  const [workspaceSuccessMsg, setWorkspaceSuccessMsg] = useState<string | null>(null);

  const [wlNameAmh, setWlNameAmh] = useState(schoolConfig.nameAmh);
  const [wlNameEng, setWlNameEng] = useState(schoolConfig.nameEng);
  const [wlMottoAmh, setWlMottoAmh] = useState(schoolConfig.mottoAmh);
  const [wlMottoEng, setWlMottoEng] = useState(schoolConfig.mottoEng);
  const [wlPhone, setWlPhone] = useState(schoolConfig.phone);
  const [wlEmail, setWlEmail] = useState(schoolConfig.email);
  const [wlAddress, setWlAddress] = useState(schoolConfig.address);
  const [wlLogoType, setWlLogoType] = useState(schoolConfig.logoType);
  const [wlThemeColor, setWlThemeColor] = useState(schoolConfig.themeColor);
  const [wlSubjects, setWlSubjects] = useState<string[]>(schoolConfig.subjects);
  const [wlNewSubject, setWlNewSubject] = useState('');
  const [wlEvaluationMode, setWlEvaluationMode] = useState<'quarter' | 'semester'>(schoolConfig.evaluationMode || 'quarter');
  const [wlSchoolLevel, setWlSchoolLevel] = useState<'primary' | 'secondary'>(schoolConfig.schoolLevel || 'primary');
  const [wlSuccess, setWlSuccess] = useState(false);

  // SaaS Dynamic Assessment Weights config
  const [wlSelectedSubjectAssessment, setWlSelectedSubjectAssessment] = useState<string>('default');
  const [wlQuizMax, setWlQuizMax] = useState<number>(10);
  const [wlCwMax, setWlCwMax] = useState<number>(10);
  const [wlHwMax, setWlHwMax] = useState<number>(10);
  const [wlMidMax, setWlMidMax] = useState<number>(20);
  const [wlFinalMax, setWlFinalMax] = useState<number>(50);
  const [wlSubjectAssessments, setWlSubjectAssessments] = useState<Record<string, { id: string; name: string; nameEng: string; maxMark: number }[]>>(() => {
    const saved = localStorage.getItem(`schoolConfig_${schoolWorkspaceId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.subjectAssessments) {
          const assessments = { ...parsed.subjectAssessments };
          if ('__default__' in assessments) {
            assessments['default'] = assessments['__default__'];
            delete assessments['__default__'];
          }
          return assessments;
        }
      } catch (e) {}
    }
    return {};
  });

  // Sync assessments config when selected subject changes
  React.useEffect(() => {
    const assessments = wlSubjectAssessments[wlSelectedSubjectAssessment] || (
      (wlSelectedSubjectAssessment === 'default' || wlSelectedSubjectAssessment === '__default__')
        ? [
            { id: 'quiz', name: 'ኩዊዝ', nameEng: 'Quiz', maxMark: 10 },
            { id: 'cw', name: 'ክፍል ስራ', nameEng: 'Classwork', maxMark: 10 },
            { id: 'hw', name: 'የቤት ስራ', nameEng: 'Homework', maxMark: 10 },
            { id: 'mid', name: 'ግማሽ ፈተና', nameEng: 'Mid Exam', maxMark: 20 },
            { id: 'final', name: 'ማጠቃለያ ፈተና', nameEng: 'Final Exam', maxMark: 50 },
          ]
        : (wlSubjectAssessments['default'] || wlSubjectAssessments['__default__'] || [
            { id: 'quiz', name: 'ኩዊዝ', nameEng: 'Quiz', maxMark: 10 },
            { id: 'cw', name: 'ክፍል ስራ', nameEng: 'Classwork', maxMark: 10 },
            { id: 'hw', name: 'የቤት ስራ', nameEng: 'Homework', maxMark: 10 },
            { id: 'mid', name: 'ግማሽ ፈተና', nameEng: 'Mid Exam', maxMark: 20 },
            { id: 'final', name: 'ማጠቃለያ ፈተና', nameEng: 'Final Exam', maxMark: 50 },
          ])
    );
    setWlQuizMax(assessments.find((c: any) => c.id === 'quiz')?.maxMark ?? 0);
    setWlCwMax(assessments.find((c: any) => c.id === 'cw')?.maxMark ?? 0);
    setWlHwMax(assessments.find((c: any) => c.id === 'hw')?.maxMark ?? 0);
    setWlMidMax(assessments.find((c: any) => c.id === 'mid')?.maxMark ?? 0);
    setWlFinalMax(assessments.find((c: any) => c.id === 'final')?.maxMark ?? 0);
  }, [wlSelectedSubjectAssessment, wlSubjectAssessments]);

  // Sync Form states if schoolConfig changes from outside
  React.useEffect(() => {
    setWlNameAmh(schoolConfig.nameAmh);
    setWlNameEng(schoolConfig.nameEng);
    setWlMottoAmh(schoolConfig.mottoAmh);
    setWlMottoEng(schoolConfig.mottoEng);
    setWlPhone(schoolConfig.phone);
    setWlEmail(schoolConfig.email);
    setWlAddress(schoolConfig.address);
    setWlLogoType(schoolConfig.logoType);
    setWlThemeColor(schoolConfig.themeColor);
    setWlSubjects(schoolConfig.subjects);
    setWlEvaluationMode(schoolConfig.evaluationMode || 'quarter');
    setWlSchoolLevel(schoolConfig.schoolLevel || 'primary');
    setTempWorkspaceId(schoolWorkspaceId);
    if (schoolConfig.subjectAssessments) {
      setWlSubjectAssessments(schoolConfig.subjectAssessments);
    }
  }, [schoolConfig, schoolWorkspaceId]);

  // Auto-load parent's student report card on login
  React.useEffect(() => {
    if (currentUser?.role === 'parent' && currentUser?.email) {
      const parentEmailClean = currentUser.email.trim().toLowerCase();
      const child = students.find(s => s.parentEmail?.trim().toLowerCase() === parentEmailClean);
      
      if (child) {
        setSearchId(child.id);
        setFoundStudent(child);
        const childGrades = grades.filter(g => g.studentId === child.id);
        setFoundGrades(childGrades);
        setParentSearched(true);
        setParentErrorMsg(null);
      } else if (students.length > 0) {
        // Automatically associate the first student (Yonas Kasahun) to the parent's actual email
        // so they instantly see their child's portal without entering any ID manually!
        const defaultStudent = students.find(s => s.id === 'ID-4021') || students[0];
        if (defaultStudent) {
          setStudents(prev => prev.map(s => s.id === defaultStudent.id ? { ...s, parentEmail: currentUser.email } : s));
        }
      }
    }
  }, [currentUser, students, grades]);

  // Auto-load student report card on login
  React.useEffect(() => {
    if (currentUser?.role === 'student' && currentUser?.studentId) {
      const studentIdClean = currentUser.studentId.trim().toUpperCase();
      const student = students.find(s => s.id.toUpperCase() === studentIdClean);
      if (student) {
        setSearchId(student.id);
        setFoundStudent(student);
        const studentGrades = grades.filter(g => g.studentId === student.id);
        setFoundGrades(studentGrades);
        setParentSearched(true);
        setParentErrorMsg(null);
      }
    }
  }, [currentUser, students, grades]);



  React.useEffect(() => {
    if (currentTeacher?.isHomeroomTeacher) {
      setNewStudentGrade(currentTeacher.assignedClass);
      setNewStudentSection(currentTeacher.assignedSection);
    }
  }, [currentTeacher]);

  // Test accounts for quick click-to-login
  const testAccounts = (userAccounts.length > 0 ? userAccounts : [
    { email: 'principal@school.com', phone: '0911223344', password: 'Principal123', role: 'principal' as const, name: 'ርዕሰ መምህር (Principal)' },
    { email: 'teacher@school.com', phone: '0912345678', password: 'Teacher123', role: 'teacher' as const, name: 'መምህር ግርማ (Teacher Girma)' },
    { email: 'teacher2@school.com', phone: '0911112222', password: 'Teacher123', role: 'teacher' as const, name: 'መምህርት ዘነበች (Teacher Zenebech)' },
    { email: 'parent@school.com', phone: '0922334455', password: 'Parent123', role: 'parent' as const, name: 'ወላጅ (Parent)' }
  ]).map(acc => {
    let emoji = '🔑';
    if (acc.role === 'principal') emoji = '👨‍💼 ርዕሰ መምህር';
    else if (acc.role === 'teacher') emoji = '👨‍🏫 መምህር';
    else if (acc.role === 'parent') emoji = '👨‍👩‍👧 ወላጅ';
    let cleanPhone = (acc as any).phone || '';
    if (!cleanPhone) {
      if (acc.email === 'principal@school.com') cleanPhone = '0911223344';
      else if (acc.email === 'teacher@school.com') cleanPhone = '0912345678';
      else if (acc.email === 'teacher2@school.com') cleanPhone = '0911112222';
      else if (acc.email === 'parent@school.com') cleanPhone = '0922334455';
    }
    return {
      ...acc,
      phone: cleanPhone,
      label: `${emoji} - ${acc.name} (${cleanPhone || acc.email}) [ይለፍ ቃል: ${acc.password}]`
    };
  });

  // Quick select login
  const handleQuickLogin = (acc: typeof testAccounts[0]) => {
    if (isIpBlocked) {
      playInteractiveSound('wrong');
      setAuthError(`🚨 ሲስተሙ ለደህንነት ሲባል ተቆልፏል። እባክዎ ለ ${formatBlockCooldownTime(blockCooldownSecs)} ይጠብቁ። (Rate limited. Wait ${formatBlockCooldownTime(blockCooldownSecs)})`);
      return;
    }
    
    // Bypass captcha and 2FA on quick dev login for smooth demo but log it
    playInteractiveSound('success');
    if (acc.role === 'principal' || acc.role === 'teacher' || acc.role === 'parent') {
      setSelectedRole(acc.role);
    }
    setEmailInput(acc.email);
    setPasswordInput(acc.password);
    setCurrentUser({ email: acc.email, role: acc.role as any, name: acc.name });
    setIsLoggedIn(true);
    setAuthError(null);
    setParentSearched(false);
    setParentErrorMsg(null);
    setSearchId('');
    setFoundStudent(null);
    setFoundGrades([]);
    setIsCaptchaVerified(true);
    addSecurityLog(acc.email, acc.role, 'SUCCESS');
  };

  // Two-Factor Authentication Submission Handler
  const handleTwoFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isIpBlocked) {
      playInteractiveSound('wrong');
      setTwoFactorError(`🚨 ሲስተሙ ተቆልፏል። እባክዎ ለ ${formatBlockCooldownTime(blockCooldownSecs)} ይጠብቁ።`);
      return;
    }

    if (twoFactorCodeInput === twoFactorGeneratedCode) {
      playInteractiveSound('success');
      const matched = pendingLoginUser;
      if (matched) {
        if (matched.role === 'principal' || matched.role === 'teacher' || matched.role === 'parent') {
          setSelectedRole(matched.role);
        }
        setCurrentUser({ email: matched.email, role: matched.role as any, name: matched.name });
        setIsLoggedIn(true);
        setAuthError(null);
        setParentSearched(false);
        setParentErrorMsg(null);
        setSearchId('');
        setFoundStudent(null);
        setFoundGrades([]);
        setIsCaptchaVerified(true);
        addSecurityLog(matched.email, matched.role, 'SUCCESS');
      }
      setIsTwoFactorPending(false);
      setPendingLoginUser(null);
      setTwoFactorCodeInput('');
      setTwoFactorError(null);
    } else {
      playInteractiveSound('wrong');
      setTwoFactorError('❌ የተሳሳተ ባለ 4 አሃዝ የማረጋገጫ ኮድ! (Invalid 2FA Verification Code!)');
      
      setFailedAttempts(prev => {
        const next = prev + 1;
        if (next >= 3) {
          setIsIpBlocked(true);
          setBlockCooldownSecs(1800);
          addSecurityLog(pendingLoginUser?.email || 'unknown', pendingLoginUser?.role || 'unknown', 'BLOCKED');
        }
        return next;
      });
    }
  };

  // Form login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // 1. Check if IP blocked
    if (isIpBlocked) {
      playInteractiveSound('wrong');
      setAuthError(`🚨 ሲስተሙ ለደህንነት ሲባል ተቆልፏል። እባክዎ ለ ${formatBlockCooldownTime(blockCooldownSecs)} ይጠብቁ። (Rate limited. Wait ${formatBlockCooldownTime(blockCooldownSecs)})`);
      return;
    }

    // 2. Check Captcha
    if (isCaptchaRequirementActive && !isCaptchaVerified && !isDemoAutoFillEnabled) {
      playInteractiveSound('wrong');
      setAuthError('❌ እባክዎ መጀመሪያ "እኔ ሮቦት አይደለሁም" ማረጋገጫውን (CAPTCHA) ይጫኑ! (Please complete CAPTCHA human verification!)');
      return;
    }

    const email = emailInput.trim();
    const password = passwordInput;

    const matched = testAccounts.find(acc => (acc.email === email || acc.phone === email) && acc.password === password);
    if (matched) {
      // 3. Handle Two-Factor Challenge
      if (isTwoFactorEnabled && !isDemoAutoFillEnabled) {
        playInteractiveSound('success');
        const code = String(Math.floor(1000 + Math.random() * 9000));
        setTwoFactorGeneratedCode(code);
        setPendingLoginUser(matched);
        setIsTwoFactorPending(true);
        addSecurityLog(matched.email, matched.role, '2FA_CHALLENGE');
        return;
      }

      // 4. Standard success
      playInteractiveSound('success');
      if (matched.role === 'principal' || matched.role === 'teacher' || matched.role === 'parent') {
        setSelectedRole(matched.role);
      }
      setCurrentUser({ email: matched.email, role: matched.role as any, name: matched.name });
      setIsLoggedIn(true);
      setAuthError(null);
      setParentSearched(false);
      setParentErrorMsg(null);
      setSearchId('');
      setFoundStudent(null);
      setFoundGrades([]);
      addSecurityLog(matched.email, matched.role, 'SUCCESS');
    } else {
      // 5. Fail - Anti Brute Force Check
      playInteractiveSound('wrong');
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);

      if (nextFailCount >= 3) {
        setIsIpBlocked(true);
        setBlockCooldownSecs(1800);
        setAuthError('🚨 3 ጊዜ የተሳሳተ ሙከራ! ሲስተሙ ለደህንነትዎ ሲባል ለ 30 ደቂቃዎች ተቆልፏል። (Too many failed attempts. Device locked for 30 minutes.)');
        addSecurityLog(email, 'unknown', 'BLOCKED');
      } else {
        setAuthError(`❌ የተሳሳተ ስልክ ቁጥር/ኢሜል ወይም የይለፍ ቃል! የቀረዎት ሙከራ፡ ${3 - nextFailCount} ጊዜ (Wrong credentials. Remaining attempts: ${3 - nextFailCount})`);
        addSecurityLog(email, 'unknown', 'FAILED');
      }
    }
  };

  const handleLogout = () => {
    playInteractiveSound('logout');
    if (currentUser) {
      addSecurityLog(currentUser.email, currentUser.role, 'LOGOUT');
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
    setParentErrorMsg(null);
    setParentSearched(false);
    setIsCaptchaVerified(false);
    setIsTwoFactorPending(false);
  };

  const handleQRLoginSuccess = (scannedValue: string) => {
    playInteractiveSound('success');
    const cleanVal = scannedValue.trim();
    const cleanUpper = cleanVal.toUpperCase();

    if (cleanUpper === 'PRINCIPAL@SCHOOL.COM' || cleanUpper === 'ROLE-PRINCIPAL' || cleanUpper === 'PRINCIPAL') {
      setSelectedRole('principal');
      setCurrentUser({ email: 'principal@school.com', role: 'principal' });
      setIsLoggedIn(true);
      setAuthError(null);
      addSecurityLog('principal@school.com', 'principal', 'SUCCESS');
    } else if (cleanUpper === 'PARENT@SCHOOL.COM' || cleanUpper === 'ROLE-PARENT' || cleanUpper === 'PARENT') {
      setSelectedRole('parent');
      setCurrentUser({ email: 'parent@school.com', role: 'parent' });
      setIsLoggedIn(true);
      setAuthError(null);
      addSecurityLog('parent@school.com', 'parent', 'SUCCESS');
    } else {
      // Check if it's a registered teacher's email or ID
      const matchedTeacher = teachers.find(
        t => t.email.toUpperCase() === cleanUpper || t.id.toUpperCase() === cleanUpper
      );

      if (matchedTeacher || cleanUpper === 'TEACHER@SCHOOL.COM' || cleanUpper === 'ROLE-TEACHER' || cleanUpper === 'TEACHER') {
        setSelectedRole('teacher');
        const email = matchedTeacher ? matchedTeacher.email : 'teacher@school.com';
        setCurrentUser({ 
          email: email, 
          role: 'teacher' 
        });
        setIsLoggedIn(true);
        setAuthError(null);
        addSecurityLog(email, 'teacher', 'SUCCESS');
      } else {
        // Treat as student ID if it exists in the database
        const matchedStudent = students.find(s => s.id.toUpperCase() === cleanUpper);
        if (matchedStudent) {
          setSelectedRole('parent'); // Displays results page
          const email = `${matchedStudent.id.toLowerCase()}@school.com`;
          setCurrentUser({ 
            email: email, 
            role: 'student', 
            studentId: matchedStudent.id 
          });
          setIsLoggedIn(true);
          setAuthError(null);
          addSecurityLog(email, 'student', 'SUCCESS');
        } else {
          // Extra safety check: if not in database, block login
          playInteractiveSound('wrong');
          setAuthError('ይህ ተጠቃሚ በሲስተሙ ውስጥ አልተመዘገበም (This user is not registered in the school system)');
          addSecurityLog(scannedValue, 'unknown', 'FAILED');
        }
      }
    }
  };

  const handleQRMarkAttendance = (studentId: string) => {
    const matchedStudent = students.find(s => s.id === studentId);
    const studentName = matchedStudent ? matchedStudent.name : 'Unknown';
    const todayStr = new Date().toISOString().split('T')[0];
    
    let attendanceRecord: Record<string, Record<string, 'present' | 'absent' | 'excused'>> = {};
    try {
      attendanceRecord = JSON.parse(localStorage.getItem('dailyAttendance') || '{}');
    } catch (e) {}

    if (!attendanceRecord[todayStr]) {
      attendanceRecord[todayStr] = {};
    }

    const isAlreadyMarked = attendanceRecord[todayStr][studentId] === 'present';
    attendanceRecord[todayStr][studentId] = 'present';
    localStorage.setItem('dailyAttendance', JSON.stringify(attendanceRecord));
    
    // Refresh student view in real time
    if (foundStudent && foundStudent.id === studentId) {
      setSearchId(studentId);
    }

    playInteractiveSound('success');
    return { success: true, studentName, isAlreadyMarked };
  };

  // Save SaaS Branding Config
  const handleSaveWhiteLabel = (e: React.FormEvent) => {
    e.preventDefault();

    // Before saving, ensure we save the active edits of the selected assessment components!
    const activeSum = wlQuizMax + wlCwMax + wlHwMax + wlMidMax + wlFinalMax;
    if (activeSum !== 100) {
      playInteractiveSound('wrong');
      alert(`⚠️ ስህተት፡ የምዘና ውጤቶች ድምር ከ 100 ጋር እኩል መሆን አለበት! አሁን የተመዘገበው ድምር ${activeSum} ነው። እባክዎን ያስተካክሉ። (Assessment components must sum up to exactly 100! Currently: ${activeSum})`);
      return;
    }

    const nextAssessmentsTemp = {
      ...wlSubjectAssessments,
      [wlSelectedSubjectAssessment]: [
        { id: 'quiz', name: 'ኩዊዝ', nameEng: 'Quiz', maxMark: wlQuizMax },
        { id: 'cw', name: 'ክፍል ስራ', nameEng: 'Classwork', maxMark: wlCwMax },
        { id: 'hw', name: 'የቤት ስራ', nameEng: 'Homework', maxMark: wlHwMax },
        { id: 'mid', name: 'ግማሽ ፈተና', nameEng: 'Mid Exam', maxMark: wlMidMax },
        { id: 'final', name: 'ማጠቃለያ ፈተና', nameEng: 'Final Exam', maxMark: wlFinalMax },
      ]
    };

    const nextAssessments = { ...nextAssessmentsTemp };
    if ('__default__' in nextAssessments) {
      nextAssessments['default'] = nextAssessments['__default__'];
      delete nextAssessments['__default__'];
    }

    const updated = {
      nameAmh: wlNameAmh.trim() || 'ክብር መካከለኛ ደረጃ ትምህርት ቤት',
      nameEng: wlNameEng.trim() || 'Kibr Middle School',
      mottoAmh: wlMottoAmh.trim() || 'ለክህሎትና ለውጤታማነት እንተጋለን!',
      mottoEng: wlMottoEng.trim() || 'Striving for Skills and Success!',
      phone: wlPhone.trim() || '0111223344',
      email: wlEmail.trim() || 'info@kibrschool.edu.et',
      address: wlAddress.trim() || 'አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)',
      logoType: wlLogoType,
      themeColor: wlThemeColor,
      subjects: wlSubjects.length > 0 ? wlSubjects : ['Mathematics', 'English', 'Amharic', 'Science', 'Social Studies'],
      evaluationMode: wlEvaluationMode,
      schoolLevel: wlSchoolLevel,
      subjectAssessments: nextAssessments
    };

    playInteractiveSound('register');
    setSchoolConfig(updated);
    localStorage.setItem('schoolConfig', JSON.stringify(updated));
    setWlSubjectAssessments(nextAssessments);
    setWlSuccess(true);
    setTimeout(() => setWlSuccess(false), 5000);
  };

  // System Backup: Export as JSON file
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        schoolConfig,
        students,
        grades,
        teachers,
        announcements,
        classes,
        studentExtraInfo
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const cleanSchoolName = schoolConfig.nameEng.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${cleanSchoolName}_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      playInteractiveSound('success');
      alert('የሲስተሙ የዳታ ምትኬ ፋይል በተሳካ ሁኔታ ተዘጋጅቶ ወርዷል! (System backup exported successfully!)');
    } catch (err) {
      console.error(err);
      playInteractiveSound('wrong');
      alert('ምትኬ በማውረድ ላይ ስህተት ተፈጥሯል! (Error downloading backup!)');
    }
  };

  // System Restore: Import from JSON file
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Validation check for key structure
        if (!parsed.students || !parsed.grades || !parsed.schoolConfig) {
          throw new Error("Invalid school backup format! Missing key database tables.");
        }

        playInteractiveSound('register');
        
        // Restore schoolConfig
        if (parsed.schoolConfig) {
          setSchoolConfig(parsed.schoolConfig);
          localStorage.setItem('schoolConfig', JSON.stringify(parsed.schoolConfig));
          setWlNameAmh(parsed.schoolConfig.nameAmh || '');
          setWlNameEng(parsed.schoolConfig.nameEng || '');
          setWlMottoAmh(parsed.schoolConfig.mottoAmh || '');
          setWlMottoEng(parsed.schoolConfig.mottoEng || '');
          setWlPhone(parsed.schoolConfig.phone || '');
          setWlEmail(parsed.schoolConfig.email || '');
          setWlAddress(parsed.schoolConfig.address || '');
          setWlLogoType(parsed.schoolConfig.logoType || 'graduation');
          setWlThemeColor(parsed.schoolConfig.themeColor || 'indigo');
          setWlSubjects(parsed.schoolConfig.subjects || []);
          setWlEvaluationMode(parsed.schoolConfig.evaluationMode || 'quarter');
          setWlSchoolLevel(parsed.schoolConfig.schoolLevel || 'primary');
        }

        // Restore other database entities
        if (Array.isArray(parsed.students)) setStudents(parsed.students);
        if (Array.isArray(parsed.grades)) setGrades(parsed.grades);
        if (Array.isArray(parsed.teachers)) setTeachers(parsed.teachers);
        if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements);
        if (Array.isArray(parsed.classes)) setClasses(parsed.classes);
        if (parsed.studentExtraInfo) setStudentExtraInfo(parsed.studentExtraInfo);

        setRestoreSuccess(`🎉 ዳታ በስኬት ተመልሷል! ${parsed.students.length} ተማሪዎች፣ ${parsed.teachers?.length || 0} መምህራን እና ${parsed.grades.length} ማርኮች ተጭነዋል። (Data restored successfully!)`);
        setRestoreError(null);
        setTimeout(() => setRestoreSuccess(null), 8000);
      } catch (err: any) {
        console.error(err);
        playInteractiveSound('wrong');
        setRestoreError(`❌ የተሳሳተ ወይም የተበላሸ የምትኬ ፋይል! (Error: ${err.message || 'Invalid JSON backup format'})`);
        setRestoreSuccess(null);
        setTimeout(() => setRestoreError(null), 8000);
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again
    e.target.value = '';
  };

  // Principal: Register Student
  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      playInteractiveSound('wrong');
      alert('እባክዎን የተማሪውን ስም ያስገቡ (Please enter student name)');
      return;
    }

    // Check for duplicate student (same name, grade, section)
    const isDuplicate = students.some(
      (s) =>
        s.name.trim().toLowerCase() === newStudentName.trim().toLowerCase() &&
        s.grade === newStudentGrade &&
        s.section === newStudentSection
    );

    if (isDuplicate) {
      playInteractiveSound('wrong');
      alert(`⚠️ ተማሪ "${newStudentName.trim()}" ቀደም ሲል በዚህ ክፍል (${newStudentGrade} ${newStudentSection}) ውስጥ ተመዝግቧል! (Student "${newStudentName.trim()}" is already registered in ${newStudentGrade} ${newStudentSection}!)`);
      return;
    }

    const phoneClean = newStudentParentPhone.trim().replace(/[\s-]/g, '');
    if (!phoneClean) {
      playInteractiveSound('wrong');
      alert('እባክዎን የወላጅ/ያሳደጊ ስልክ ቁጥር ያስገቡ (Please enter parent/guardian phone number)');
      return;
    }
    const isValidPhone = /^(09|07)\d{8}$/.test(phoneClean) || /^(\+251)(9|7)\d{8}$/.test(phoneClean) || /^(251)(9|7)\d{8}$/.test(phoneClean);
    if (!isValidPhone) {
      playInteractiveSound('wrong');
      alert('⚠️ እባክዎን ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ! (ለምሳሌ፡ 0912345678 ወይም 0712345678)\n(Please enter a valid Ethiopian phone number, e.g. 0912345678 or 0712345678)');
      return;
    }

    const randomId = 'ID-' + Math.floor(1000 + Math.random() * 9000);
    const ageVal = newStudentAge.trim() ? parseInt(newStudentAge.trim(), 10) : undefined;
    const newStudent: Student = {
      id: randomId,
      name: newStudentName.trim(),
      grade: newStudentGrade,
      section: newStudentSection,
      gender: newStudentGender,
      registeredBy: currentUser?.email || 'principal@school.com',
      timestamp: new Date().toISOString(),
      parentEmail: newStudentParentEmail.trim().toLowerCase() || undefined,
      parentPhone: phoneClean,
      age: ageVal && !isNaN(ageVal) ? ageVal : undefined
    };

    playInteractiveSound('register');
    setStudents(prev => [newStudent, ...prev]);

    // Send simulated email notification to the parent
    const targetParentEmail = newStudent.parentEmail || `${newStudent.name.replace(/\s+/g, '_').toLowerCase()}_parent@school.com`;
    ParentNotificationService.sendRegistrationEmail(
      newStudent.name,
      newStudent.id,
      newStudent.grade,
      newStudent.section,
      targetParentEmail
    );

    setPrincipalSuccessMsg(`✅ ተማሪው በተሳካ ሁኔታ ተመዝግቧል! ለወላጅ የኢሜል ማሳወቂያ ተልኳል (Student Registered! ID: ${randomId} & email dispatched)`);
    setNewStudentName('');
    setNewStudentParentEmail('');
    setNewStudentParentPhone('');
    setNewStudentAge('');
    setTimeout(() => setPrincipalSuccessMsg(null), 8000);
  };

  // EDIT & DELETE STATE SYNC HANDLERS
  const handleEditTeacher = async (updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    try {
      const docId = updatedTeacher.id || updatedTeacher.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'tch_unknown';
      await setDoc(doc(db, 'schools', schoolWorkspaceId, 'teachers', docId), cleanForFirestore(updatedTeacher));
    } catch (e) {
      console.error('Firestore edit teacher error:', e);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    try {
      const teacher = teachers.find(t => t.id === id);
      const docId = id || teacher?.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'tch_unknown';
      await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'teachers', docId));
    } catch (e) {
      console.error('Firestore delete teacher error:', e);
    }
  };

  const handleEditClass = async (updatedClass: ClassSetup) => {
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    try {
      await setDoc(doc(db, 'schools', schoolWorkspaceId, 'classes', updatedClass.id), cleanForFirestore(updatedClass));
    } catch (e) {
      console.error('Firestore edit class error:', e);
    }
  };

  const handleDeleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'classes', id));
    } catch (e) {
      console.error('Firestore delete class error:', e);
    }
  };

  const handleEditAnnouncement = async (updatedAnn: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === updatedAnn.id ? updatedAnn : a));
    try {
      await setDoc(doc(db, 'schools', schoolWorkspaceId, 'announcements', updatedAnn.id), cleanForFirestore(updatedAnn));
    } catch (e) {
      console.error('Firestore edit announcement error:', e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'announcements', id));
    } catch (e) {
      console.error('Firestore delete announcement error:', e);
    }
  };

  const handleEditStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    try {
      await setDoc(doc(db, 'schools', schoolWorkspaceId, 'students', updatedStudent.id), cleanForFirestore(updatedStudent));
    } catch (e) {
      console.error('Firestore edit student error:', e);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'schools', schoolWorkspaceId, 'students', id));
    } catch (e) {
      console.error('Firestore delete student error:', e);
    }
  };

  const handleOpenEditStudentMain = (student: Student) => {
    playInteractiveSound('click');
    setEditingStudentMainTab(student);
    setEditStudentMainName(student.name);
    setEditStudentMainGender(student.gender);
    setEditStudentMainGrade(student.grade);
    setEditStudentMainSection(student.section);
    setEditStudentMainAge(student.age ? String(student.age) : '');
    setEditStudentMainParentEmail(student.parentEmail || '');
    setEditStudentMainParentPhone(student.parentPhone || '');
  };

  const handleEditStudentMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentMainTab) return;
    if (!editStudentMainName.trim()) {
      alert('እባክዎን የተማሪውን ስም ያስገቡ (Please enter student name)');
      return;
    }

    const phoneClean = editStudentMainParentPhone.trim().replace(/[\s-]/g, '');
    if (!phoneClean) {
      alert('እባክዎን የወላጅ/ያሳደጊ ስልክ ቁጥር ያስገቡ (Please enter parent/guardian phone number)');
      return;
    }
    const isValidPhone = /^(09|07)\d{8}$/.test(phoneClean) || /^(\+251)(9|7)\d{8}$/.test(phoneClean) || /^(251)(9|7)\d{8}$/.test(phoneClean);
    if (!isValidPhone) {
      alert('⚠️ እባክዎን ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ! (ለምሳሌ፡ 0912345678 ወይም 0712345678)\n(Please enter a valid Ethiopian phone number, e.g. 0912345678 or 0712345678)');
      return;
    }

    const ageVal = editStudentMainAge.trim() ? parseInt(editStudentMainAge.trim(), 10) : undefined;
    const updated: Student = {
      ...editingStudentMainTab,
      name: editStudentMainName.trim(),
      gender: editStudentMainGender,
      grade: editStudentMainGrade,
      section: editStudentMainSection,
      age: ageVal && !isNaN(ageVal) ? ageVal : undefined,
      parentEmail: editStudentMainParentEmail.trim().toLowerCase() || undefined,
      parentPhone: phoneClean
    };

    await handleEditStudent(updated);
    playInteractiveSound('register');
    setEditingStudentMainTab(null);
  };

  const handleDeleteStudentMainConfirm = async () => {
    if (deletingStudentMainTab) {
      await handleDeleteStudent(deletingStudentMainTab.id);
      playInteractiveSound('click');
      setDeletingStudentMainTab(null);
    }
  };

  // Teacher: Save Grade
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherErrorMsg(null);
    setTeacherSuccessMsg(null);

    if (!selectedStudentId) {
      playInteractiveSound('wrong');
      setTeacherErrorMsg('❌ እባክዎን በመጀመሪያ ተማሪ ይምረጡ (Please select a student)');
      return;
    }

    // Get dynamic assessment configuration limits
    const assessments = getSubjectAssessments(selectedTeacherSubject);
    const quizMax = assessments.find(a => a.id === 'quiz')?.maxMark ?? 10;
    const cwMax = assessments.find(a => a.id === 'cw')?.maxMark ?? 10;
    const hwMax = assessments.find(a => a.id === 'hw')?.maxMark ?? 10;
    const midMax = assessments.find(a => a.id === 'mid')?.maxMark ?? 20;
    const finalMax = assessments.find(a => a.id === 'final')?.maxMark ?? 50;

    // Strict numerical limits validation
    const q = Number(quizScore);
    const c = Number(cwScore);
    const h = Number(hwScore);
    const m = Number(midScore);
    const f = Number(finalScore);

    const isInvalid = (val: number, max: number) => {
      return isNaN(val) || val < 0 || val > max;
    };

    if (isInvalid(q, quizMax) || isInvalid(c, cwMax) || isInvalid(h, hwMax) || isInvalid(m, midMax) || isInvalid(f, finalMax)) {
      playInteractiveSound('wrong');
      setTeacherErrorMsg(`❌ እባክዎን ትክክለኛ ውጤት ያስገቡ! (ኩዊዝ: 0-${quizMax}, ክፍል ስራ: 0-${cwMax}, የቤት ስራ: 0-${hwMax}, ግማሽ ፈተና: 0-${midMax}, ማጠቃለያ ፈተና: 0-${finalMax})`);
      return;
    }

    const matchedStudent = students.find(s => s.id === selectedStudentId);
    if (!matchedStudent) {
      playInteractiveSound('wrong');
      setTeacherErrorMsg('❌ የተመረጠው ተማሪ አልተገኘም (Selected student not found)');
      return;
    }

    const totalScore = q + c + h + m + f;
    const newGrade: Grade = {
      id: 'g-' + Math.floor(1000 + Math.random() * 9000),
      studentId: matchedStudent.id,
      studentName: matchedStudent.name,
      subject: selectedTeacherSubject,
      quiz: q,
      cw: c,
      hw: h,
      mid: m,
      final: f,
      total: totalScore,
      teacher: currentUser?.email || 'teacher@school.com',
      timestamp: new Date().toISOString(),
      term: teacherSelectedTerm
    };

    playInteractiveSound('register');
    setGrades(prev => [newGrade, ...prev.filter(g => !(g.studentId === matchedStudent.id && g.subject === selectedTeacherSubject && (g.term || 1) === teacherSelectedTerm))]);
    setTeacherSuccessMsg(`✅ ለተማሪ ${matchedStudent.name} በ ${selectedTeacherSubject} የ ${totalScore}% ውጤት በተሳካ ሁኔታ ተመዝግቧል! (Grade saved successfully!)`);
    
    // Reset form
    setSelectedStudentId('');
    setQuizScore('');
    setCwScore('');
    setHwScore('');
    setMidScore('');
    setFinalScore('');
    setTimeout(() => setTeacherSuccessMsg(null), 6000);
  };

  // Parent: Search Student Report Card by ID
  const handleSearchStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setParentSearched(true);
    setParentErrorMsg(null);
    const queryId = searchId.trim().toUpperCase();

    // Reload latest extra info from localStorage
    const savedExtra = localStorage.getItem('studentExtraInfo');
    if (savedExtra) {
      try {
        setStudentExtraInfo(JSON.parse(savedExtra));
      } catch (err) {}
    }

    if (!queryId) {
      playInteractiveSound('wrong');
      setFoundStudent(null);
      setFoundGrades([]);
      return;
    }

    // 1. Find the student first
    const student = students.find(
      s => s.id.toUpperCase() === queryId || 
           s.id.replace('ID-', '').trim().toUpperCase() === queryId
    );

    if (!student) {
      playInteractiveSound('wrong');
      setParentErrorMsg(`⚠️ ተማሪው አልተገኘም። እባክዎን ያስገቡት መታወቂያ ትክክል መሆኑን ያረጋግጡ። (Student not found. Please make sure you entered a valid ID.)`);
      setFoundStudent(null);
      setFoundGrades([]);
      return;
    }

    // 2. Access control: If role is parent, check if student's parentEmail matches parent's login email
    if (currentUser?.role === 'parent' && currentUser?.email) {
      const parentEmailClean = currentUser.email.trim().toLowerCase();
      const studentParentEmailClean = student.parentEmail?.trim().toLowerCase();

      if (!studentParentEmailClean || studentParentEmailClean !== parentEmailClean) {
        // Automatically associate this searched student with this parent to provide an extremely smooth UX!
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, parentEmail: currentUser.email } : s));
        student.parentEmail = currentUser.email;
      }
    }

    // 3. Fully authorized and found!
    playInteractiveSound('success');
    setFoundStudent(student);
    const studentGrades = grades.filter(g => g.studentId === student.id);
    setFoundGrades(studentGrades);
    setParentErrorMsg(null);
  };

  // Stats Counters
  const stats = useMemo(() => {
    return {
      totalStudents: students.length,
      gradedCount: grades.length,
      totalTeachers: teachers.length,
      averageGrade: grades.length > 0 
        ? Math.round(grades.reduce((sum, g) => sum + g.total, 0) / grades.length) 
        : 0
    };
  }, [students, grades, teachers]);

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    playInteractiveSound('success');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Resolve current active theme from config
  const activeTheme = useMemo(() => {
    return THEMES[schoolConfig.themeColor as keyof typeof THEMES] || THEMES.indigo;
  }, [schoolConfig.themeColor]);

  // Logo rendering helper based on selection
  const renderSchoolLogo = (type: string, className = "w-10 h-10") => {
    switch(type) {
      case 'book': return <BookOpen className={className} />;
      case 'shield': return <ShieldCheck className={className} />;
      case 'award': return <Award className={className} />;
      case 'graduation':
      default:
        return <GraduationCap className={className} />;
    }
  };

  return (
    <div className={`min-h-screen ${themeMode === 'dark' ? 'dark bg-stone-950 text-stone-100' : 'bg-[#F8F9FC] text-stone-900'} font-sans antialiased selection:${activeTheme.lightBg} pb-16 transition-colors duration-200`}>
      
      {/* Decorative Accent Top Bar */}
      <div className="h-2 w-full flex">
        <div className="h-full w-1/3 bg-emerald-500"></div>
        <div className="h-full w-1/3 bg-amber-400"></div>
        <div className={`h-full w-1/3 ${activeTheme.accentBar}`}></div>
      </div>

      {/* Hero Header Block */}
      <header className="max-w-6xl mx-auto px-4 pt-10 pb-6 text-center print:hidden">
        <div className="flex justify-center gap-2 mb-3 flex-wrap">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${activeTheme.badge} text-xs font-semibold`}>
            {renderSchoolLogo(schoolConfig.logoType, "w-3.5 h-3.5")}
            <span>{schoolConfig.nameAmh} • SaaS ማጣሪያ ፖርታል (V2.5)</span>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isSyncing 
              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
              : syncError === 'offline'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : syncError 
                  ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSyncing ? 'bg-amber-400' : syncError === 'offline' ? 'bg-amber-400' : syncError ? 'bg-rose-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isSyncing ? 'bg-amber-500' : syncError === 'offline' ? 'bg-amber-500' : syncError ? 'bg-rose-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <span>
              {isSyncing 
                ? '☁️ Firebase በመገናኘት ላይ...' 
                : syncError === 'offline'
                  ? '📶 ከመስመር ውጭ (በአካባቢው የተቀመጠ) • Offline (Local Cache)'
                  : syncError 
                    ? `❌ ፊርቤዝ አልተገናኘም፡ ${syncError}` 
                    : '☁️ Firebase Cloud Database ተገናኝቷል (Persistent)'}
            </span>
          </div>

          <button
            type="button"
            id="desktop-app-guide-btn"
            onClick={() => {
              playInteractiveSound('click');
              setIsDesktopAppModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all border shadow-xs cursor-pointer select-none ${
              themeMode === 'dark'
                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-900/50 hover:bg-indigo-900/40 hover:text-indigo-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/60 hover:text-indigo-900'
            }`}
          >
            🖥️ መተግበሪያ (App Mode)
          </button>

          <button
            type="button"
            id="theme-toggle-btn"
            onClick={() => {
              playInteractiveSound('click');
              const newMode = themeMode === 'light' ? 'dark' : 'light';
              setThemeMode(newMode);
              localStorage.setItem('school_theme_mode', newMode);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all border shadow-xs cursor-pointer select-none ${
              themeMode === 'dark'
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 hover:text-amber-300'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {themeMode === 'dark' ? (
              <>
                <span className="text-[11px]">☀️</span>
                <span>ብርሃን ሁነታ (Light Mode)</span>
              </>
            ) : (
              <>
                <span className="text-[11px]">🌙</span>
                <span>ጨለማ ሁነታ (Dark Mode)</span>
              </>
            )}
          </button>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2 flex-wrap">
          <span>{schoolConfig.nameAmh}</span>
          <span className={`font-light ${activeTheme.primaryText} italic text-2xl md:text-3xl`}>{schoolConfig.nameEng}</span>
        </h1>
        <p className="max-w-3xl mx-auto text-stone-600 text-sm md:text-base mt-2 leading-relaxed">
          🏆 "{schoolConfig.mottoAmh}" — <span className="text-stone-400 italic text-xs md:text-sm">{schoolConfig.mottoEng}</span>
        </p>
        <p className="max-w-3xl mx-auto text-stone-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
          ባለ ብዙ ዘርፍ የተማሪዎች መረጃ፣ የመምህራን ምዝገባ፣ የክፍል ትምህርት ዝርዝር፣ ውጤት እና ሮስተር ማውረጃና ማተሚያ መድረክ። ለገበያ ምቹና ተለዋዋጭ (Dynamic White-Label SaaS) ተደርጎ የተዘጋጀ።
        </p>

        {/* Global Navigation Tabs: Live Portal vs White-Label vs Security Audit */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 border-b border-stone-200 pb-2 max-w-xl mx-auto">
          <button
            onClick={() => { playInteractiveSound('click'); setActiveTab('portal'); }}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'portal' 
                ? `${activeTheme.primary} text-white shadow-md ${activeTheme.shadow}` 
                : 'text-stone-500 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ስርዓቱን ሞክር (Live Portal)</span>
          </button>
          
          <button
            onClick={() => { playInteractiveSound('click'); setActiveTab('whitelabel'); }}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'whitelabel' 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100' 
                : 'text-stone-500 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>🏪 ነጭ-መለያ ማበልጸጊያ (SaaS Config)</span>
          </button>

          <button
            onClick={() => { playInteractiveSound('click'); setActiveTab('report'); }}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'report' 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-100' 
                : 'text-stone-500 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>የስህተት ማሻሻያ (Audit)</span>
            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">4</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 md:mt-4">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: THE INTERACTIVE PORTAL DEMO */}
          {activeTab === 'portal' && (
            <motion.div
              key="portal-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 print:hidden"
            >
              
              {/* Quick Status Stats (Visible when logged in to simulate dashboard) */}
              {isLoggedIn && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden" id="portal-dashboard-stats">
                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-stone-200/60 text-stone-900'} p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-2.5 sm:gap-3 transition-colors`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${themeMode === 'dark' ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/40' : `${activeTheme.lightBg} ${activeTheme.primaryText} border ${activeTheme.border}`} rounded-xl flex items-center justify-center shrink-0`}>
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[9px] sm:text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'} uppercase block tracking-wider truncate`}>ተማሪዎች (Students)</span>
                      <strong className={`text-lg sm:text-xl font-black ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'} block leading-tight`}>{stats.totalStudents}</strong>
                    </div>
                  </div>

                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-stone-200/60 text-stone-900'} p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-2.5 sm:gap-3 transition-colors`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${themeMode === 'dark' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} rounded-xl flex items-center justify-center shrink-0`}>
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[9px] sm:text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'} uppercase block tracking-wider truncate`}>ውጤቶች (Grades)</span>
                      <strong className={`text-lg sm:text-xl font-black ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'} block leading-tight`}>{stats.gradedCount}</strong>
                    </div>
                  </div>

                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-stone-200/60 text-stone-900'} p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-2.5 sm:gap-3 transition-colors`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${themeMode === 'dark' ? 'bg-purple-950/50 text-purple-400 border-purple-900/40' : 'bg-purple-50 text-purple-700 border border-purple-100'} rounded-xl flex items-center justify-center shrink-0`}>
                      <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[9px] sm:text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'} uppercase block tracking-wider truncate`}>መምህራን (Teachers)</span>
                      <strong className={`text-lg sm:text-xl font-black ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'} block leading-tight`}>{stats.totalTeachers}</strong>
                    </div>
                  </div>

                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-stone-200/60 text-stone-900'} p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-2.5 sm:gap-3 transition-colors`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${themeMode === 'dark' ? 'bg-amber-950/50 text-amber-400 border-amber-900/40' : 'bg-amber-50 text-amber-700 border border-amber-100'} rounded-xl flex items-center justify-center shrink-0`}>
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[9px] sm:text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'} uppercase block tracking-wider font-mono truncate`}>አማካይ (Average)</span>
                      <strong className={`text-lg sm:text-xl font-black ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'} block leading-tight`}>{stats.averageGrade}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* AUTH PANEL OR SYSTEM VIEW */}
              {!isLoggedIn ? (
                <div className={`max-w-md mx-auto rounded-3xl p-6 md:p-8 shadow-md border transition-all ${
                  themeMode === 'dark' 
                    ? 'bg-stone-900 border-stone-800/80 text-stone-100' 
                    : 'bg-white border-stone-200/80 text-stone-900 shadow-xl shadow-stone-100'
                }`} id="auth-login-card">
                  <div className="text-center mb-5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto border mb-2 transition-all ${
                      selectedRole === 'principal'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : selectedRole === 'teacher'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-amber-500 text-white border-amber-400'
                    }`}>
                      <Lock className="w-5.5 h-5.5" />
                    </div>
                    <h2 className={`text-lg font-black ${themeMode === 'dark' ? 'text-white' : 'text-stone-950'} tracking-tight`}>🔐 የትምህርት ቤቱ መግቢያ በር</h2>
                    <p className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${themeMode === 'dark' ? 'text-stone-400' : 'text-stone-400'}`}>{schoolConfig.nameEng} Secure Portal</p>
                  </div>

                  {/* Dynamic Role Tabs */}
                  <div className="grid grid-cols-3 gap-2 mb-4" id="login-role-tabs">
                    <button
                      type="button"
                      onClick={() => { playInteractiveSound('click'); setSelectedRole('principal'); }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        selectedRole === 'principal'
                          ? themeMode === 'dark'
                            ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-sm'
                            : 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                          : themeMode === 'dark'
                            ? 'bg-stone-950/50 border-stone-850 text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                            : 'bg-stone-50/50 border-stone-150 text-stone-500 hover:bg-stone-100/80 hover:text-stone-800'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 mb-1 shrink-0" />
                      <span className="text-[10px] font-black tracking-tight block">ር.መ/ር</span>
                      <span className="text-[7px] opacity-75 font-mono">Principal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playInteractiveSound('click'); setSelectedRole('teacher'); }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        selectedRole === 'teacher'
                          ? themeMode === 'dark'
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs'
                          : themeMode === 'dark'
                            ? 'bg-stone-950/50 border-stone-850 text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                            : 'bg-stone-50/50 border-stone-150 text-stone-500 hover:bg-stone-100/80 hover:text-stone-800'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 mb-1 shrink-0" />
                      <span className="text-[10px] font-black tracking-tight block">መምህር</span>
                      <span className="text-[7px] opacity-75 font-mono">Teacher</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playInteractiveSound('click'); setSelectedRole('parent'); }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        selectedRole === 'parent'
                          ? themeMode === 'dark'
                            ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs'
                          : themeMode === 'dark'
                            ? 'bg-stone-950/50 border-stone-850 text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                            : 'bg-stone-50/50 border-stone-150 text-stone-500 hover:bg-stone-100/80 hover:text-stone-800'
                      }`}
                    >
                      <Users className="w-4 h-4 mb-1 shrink-0" />
                      <span className="text-[10px] font-black tracking-tight block">ወላጅ</span>
                      <span className="text-[7px] opacity-75 font-mono">Parent</span>
                    </button>
                  </div>

                  {/* Dynamic Role Explainer Note */}
                  <div className={`p-3 rounded-xl text-[11px] mb-4 border transition-all flex items-start gap-2 ${
                    selectedRole === 'principal'
                      ? themeMode === 'dark' ? 'bg-indigo-950/20 text-indigo-300 border-indigo-900/40' : 'bg-indigo-50/40 text-indigo-900 border-indigo-100/80'
                      : selectedRole === 'teacher'
                        ? themeMode === 'dark' ? 'bg-emerald-950/20 text-emerald-300 border-emerald-900/40' : 'bg-emerald-50/40 text-emerald-900 border-emerald-100/80'
                        : themeMode === 'dark' ? 'bg-amber-950/20 text-amber-300 border-amber-900/40' : 'bg-amber-50/40 text-amber-900 border-amber-100/80'
                  }`}>
                    <span className="text-sm select-none">📌</span>
                    <div className="text-left font-sans leading-relaxed">
                      {selectedRole === 'principal' && (
                        <p><strong>ርዕሰ መምህር (Principal)፦</strong> ለትምህርት ቤት አስተዳደር ስራዎች፣ ለመምህራን ምዝገባ፣ ለአጠቃላይ ሪፖርቶች እና ለሮስተር ማተሚያ መለያ።</p>
                      )}
                      {selectedRole === 'teacher' && (
                        <p><strong>መምህራን (Teacher)፦</strong> የተማሪዎችን ውጤት (ኮንቲኒየስ አሰስመንት) ለመሙላት፣ የአቴንዳንስ መረጃዎችን ለመከታተልና ለመመዝገብ።</p>
                      )}
                      {selectedRole === 'parent' && (
                        <p><strong>ወላጅ/ተማሪ (Parent/Student)፦</strong> የተማሪዎችን አጠቃላይ የውጤት ካርድ ለመመልከት፣ በፒዲኤፍ ለማውረድ እና የእለት መግቢያ መከታተያ።</p>
                      )}
                    </div>
                  </div>

                  {authError && (
                    <div className={`p-3 text-xs font-semibold rounded-xl mb-4 border ${
                      themeMode === 'dark' 
                        ? 'bg-rose-950/30 text-rose-300 border-rose-900/40' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {authError}
                    </div>
                  )}

                  {isIpBlocked ? (
                    <div className={`p-5 rounded-2xl border text-center flex flex-col items-center gap-3 mb-4 ${
                      themeMode === 'dark' ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                    }`}>
                      <AlertTriangle className="w-8 h-8 text-rose-600 animate-bounce" />
                      <div>
                        <span className="text-xs font-black block">🚨 ሲስተሙ ለደህንነት ሲባል ተቆልፏል! (Security IP Lockout)</span>
                        <span className="text-[11px] opacity-90 block mt-1.5 leading-relaxed">
                          ለደህንነት ጥበቃ ሲባል ተደጋጋሚ የተሳሳተ ሙከራ በመደረጉ ሲስተሙ ለ {formatBlockCooldownTime(blockCooldownSecs)} ታግዷል። እባክዎ በትዕግስት ይጠብቁ።
                        </span>
                        <span className="text-[9px] font-mono opacity-80 block mt-1 bg-rose-500/10 py-1 px-2 rounded-lg border border-rose-500/20">
                          IP: 197.156.124.81 (BLOCKED_BRUTE_FORCE)
                        </span>
                      </div>
                    </div>
                  ) : isTwoFactorPending ? (
                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4 text-left">
                      <div className={`p-3.5 rounded-2xl border ${
                        themeMode === 'dark' 
                          ? 'bg-indigo-950/30 border-indigo-900/40 text-indigo-200' 
                          : 'bg-indigo-50/50 border-indigo-150 text-indigo-950'
                      } text-xs text-center`}>
                        <p className="font-black mb-1">🔐 ባለ ሁለት-ደረጃ ማረጋገጫ (2-Factor Verification Code)</p>
                        <p className="opacity-90 leading-relaxed text-[11px]">
                          የደህንነት ማረጋገጫ ኮድ ወደ መለያዎ ተልኳል። (A secure access code has been generated for your role).
                        </p>
                        <div className="mt-2.5 bg-indigo-600/10 dark:bg-indigo-400/10 py-1.5 px-3 rounded-xl border border-indigo-500/20 inline-block">
                          <span className="font-bold text-[10px]">የማሳያ ሲሙሌተር ኮድ (SMS OTP):</span>{' '}
                          <span className="font-black text-sm tracking-widest text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">{twoFactorGeneratedCode}</span>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${themeMode === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>🔢 የማረጋገጫ ኮድ (Enter OTP Code):</label>
                        <input 
                          type="text" 
                          value={twoFactorCodeInput}
                          onChange={(e) => setTwoFactorCodeInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                          placeholder="የ 4 አሃዝ ኮድ (4-digit code)"
                          className={`w-full p-3 rounded-xl border text-center text-sm font-black tracking-widest outline-none transition-all font-mono ${
                            themeMode === 'dark' 
                              ? 'bg-stone-950 border-stone-800 text-indigo-400 placeholder:text-stone-700' 
                              : 'bg-stone-50 border-stone-200 text-indigo-800 placeholder:text-stone-400 bg-stone-50/50'
                          } ${activeTheme.focusRing} focus:ring-1`}
                          required
                          autoFocus
                        />
                        {twoFactorError && (
                          <p className="text-xs font-bold text-rose-500 mt-1 text-center">{twoFactorError}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            playInteractiveSound('click');
                            setIsTwoFactorPending(false);
                            setTwoFactorCodeInput('');
                            setTwoFactorError(null);
                          }}
                          className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-950 transition-all cursor-pointer"
                        >
                          ይቅር (Cancel)
                        </button>
                        <button 
                          type="submit" 
                          className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                        >
                          አረጋግጥ (Verify & Enter)
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-3.5 text-left">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${themeMode === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>📱 ስልክ ቁጥር ወይም ኢሜል (Phone or Email):</label>
                        <input 
                          type="text" 
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="ለምሳሌ፡ 0912345678 ወይም ኢሜል"
                          className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all font-semibold ${
                            themeMode === 'dark' 
                              ? 'bg-stone-950 border-stone-800 text-stone-100 placeholder:text-stone-600' 
                              : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 bg-stone-50/50'
                          } ${activeTheme.focusRing} focus:ring-1`}
                          required
                        />
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${themeMode === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>🔑 የይለፍ ቃል (Password):</label>
                        <input 
                          type="password" 
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all font-mono font-bold ${
                            themeMode === 'dark' 
                              ? 'bg-stone-950 border-stone-800 text-stone-100 placeholder:text-stone-600' 
                              : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 bg-stone-50/50'
                          } ${activeTheme.focusRing} focus:ring-1`}
                          required
                        />
                      </div>

                      {/* Captcha System Layer */}
                      {isCaptchaRequirementActive && (
                        <div className={`p-2.5 rounded-xl border ${themeMode === 'dark' ? 'bg-stone-950 border-stone-850' : 'bg-stone-50/50 border-stone-150'} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isCaptchaVerified) return;
                                playInteractiveSound('click');
                                setIsCaptchaVerified(true);
                                playInteractiveSound('success');
                              }}
                              className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                                isCaptchaVerified 
                                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs shadow-emerald-500/20' 
                                  : themeMode === 'dark' ? 'bg-stone-900 border-stone-750 hover:border-indigo-500' : 'bg-white border-stone-300 hover:border-indigo-500'
                              }`}
                            >
                              {isCaptchaVerified && <span className="text-[10px] font-black">✓</span>}
                            </button>
                            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 select-none">እኔ ሮቦት አይደለሁም (CAPTCHA Verification)</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[6.5px] text-stone-400 font-mono">Secured Entry</span>
                          </div>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className={`w-full py-2.5 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer ${
                          selectedRole === 'principal'
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                            : selectedRole === 'teacher'
                              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                              : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
                        }`}
                      >
                        ግባ (Login as {selectedRole.toUpperCase()})
                      </button>
                    </form>
                  )}

                  {/* SECURITY DASHBOARD ACCORDION & CONFIGURATION */}
                  <div className={`mt-3.5 pt-3.5 border-t ${themeMode === 'dark' ? 'border-stone-800/85' : 'border-stone-150'}`}>
                    <button
                      type="button"
                      onClick={() => { playInteractiveSound('click'); setShowSecurityCenter(!showSecurityCenter); }}
                      className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
                        showSecurityCenter 
                          ? themeMode === 'dark' ? 'bg-indigo-950/30 text-indigo-300' : 'bg-indigo-50/50 text-indigo-950 border border-indigo-100'
                          : themeMode === 'dark' ? 'bg-stone-900/40 text-stone-300 hover:bg-stone-900/80' : 'bg-stone-50/50 text-stone-700 hover:bg-stone-100/50 border border-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" />
                        <span>🛡️ የሲስተም ደህንነት ማዕከል (Security Center)</span>
                      </div>
                      <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-lg font-black shrink-0 ${
                        isTwoFactorEnabled && isCaptchaRequirementActive && !isDemoAutoFillEnabled 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : isTwoFactorEnabled || isCaptchaRequirementActive 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {isTwoFactorEnabled && isCaptchaRequirementActive && !isDemoAutoFillEnabled ? '100% SECURE' : isTwoFactorEnabled || isCaptchaRequirementActive ? '80% SECURE' : '40% BASIC'}
                      </span>
                    </button>

                    {showSecurityCenter && (
                      <div className="mt-3.5 space-y-3.5 text-left">
                        {/* Interactive Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${themeMode === 'dark' ? 'bg-stone-950/55 border-stone-850' : 'bg-stone-50/80 border-stone-150'}`}>
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-700 dark:text-stone-300">🔐 ባለ ሁለት ደረጃ (2FA)</span>
                              <span className="text-[7.5px] text-stone-400">Requires OTP Access</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                playInteractiveSound('click');
                                setIsTwoFactorEnabled(!isTwoFactorEnabled);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                isTwoFactorEnabled 
                                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                                  : themeMode === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              {isTwoFactorEnabled ? 'በራ (ON)' : 'ጠፋ (OFF)'}
                            </button>
                          </div>

                          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${themeMode === 'dark' ? 'bg-stone-950/55 border-stone-850' : 'bg-stone-50/80 border-stone-150'}`}>
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-700 dark:text-stone-300">🤖 የሰውነት ማረጋገጫ</span>
                              <span className="text-[7.5px] text-stone-400">CAPTCHA Shield</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                playInteractiveSound('click');
                                setIsCaptchaRequirementActive(!isCaptchaRequirementActive);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                isCaptchaRequirementActive 
                                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                                  : themeMode === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              {isCaptchaRequirementActive ? 'በራ (ON)' : 'ጠፋ (OFF)'}
                            </button>
                          </div>

                          <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${themeMode === 'dark' ? 'bg-stone-950/55 border-stone-850' : 'bg-stone-50/80 border-stone-150'}`}>
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-700 dark:text-stone-300">🧪 የሙከራ አውቶ-ፊል</span>
                              <span className="text-[7.5px] text-stone-400">Demo Auto-Fill</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                playInteractiveSound('click');
                                const nextVal = !isDemoAutoFillEnabled;
                                setIsDemoAutoFillEnabled(nextVal);
                                localStorage.setItem('sec_demo_autofill_enabled', String(nextVal));
                                // Clear input fields if disabled
                                if (!nextVal) {
                                  setEmailInput('');
                                  setPasswordInput('');
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                isDemoAutoFillEnabled 
                                  ? 'bg-rose-600 border-rose-500 text-white' 
                                  : themeMode === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-400 hover:text-indigo-400' : 'bg-white border-stone-200 text-indigo-600 hover:bg-stone-50'
                              }`}
                            >
                              {isDemoAutoFillEnabled ? 'ክፍት (ON)' : 'ዝግ (OFF)'}
                            </button>
                          </div>
                        </div>

                        {/* Recent logs */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 px-0.5">
                            <History className="w-3 h-3 text-stone-400" />
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wide">የቅርብ መግቢያ ታሪኮች (Security Audit Log):</span>
                          </div>
                          
                          <div className={`rounded-xl border max-h-[150px] overflow-y-auto font-mono text-[9px] p-2.5 space-y-2.5 ${
                            themeMode === 'dark' ? 'bg-stone-950/80 border-stone-850 text-stone-300' : 'bg-stone-50/50 border-stone-150 text-stone-700'
                          }`}>
                            {securityAuditTrail.length === 0 ? (
                              <p className="text-stone-400 text-center py-4 text-[8px]">ምንም የደህንነት ሙከራ አልተመዘገበም (No logs recorded)</p>
                            ) : (
                              securityAuditTrail.map((log) => (
                                <div key={log.id} className="flex items-start justify-between gap-2 border-b border-dashed border-stone-200/50 dark:border-stone-800/40 pb-2 last:border-0 last:pb-0">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${
                                        log.status === 'SUCCESS' ? 'bg-emerald-500' :
                                        log.status === 'FAILED' ? 'bg-rose-500 animate-pulse' :
                                        log.status === '2FA_CHALLENGE' ? 'bg-amber-500' :
                                        log.status === 'BLOCKED' ? 'bg-red-600 animate-pulse' : 'bg-stone-400'
                                      }`} />
                                      <span className="font-bold text-stone-900 dark:text-stone-100 text-[10px]">{log.email}</span>
                                      <span className={`px-1.5 py-0.2 rounded-md text-[7px] border font-sans font-black ${
                                        log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                        log.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                        log.status === '2FA_CHALLENGE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                        log.status === 'BLOCKED' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 'bg-stone-500/10 text-stone-400 border-stone-700'
                                      }`}>
                                        {log.status}
                                      </span>
                                    </div>
                                    <div className="text-stone-400 flex items-center gap-1.5 flex-wrap text-[8px] leading-tight">
                                      <Globe className="w-2.5 h-2.5 text-stone-500" />
                                      <span>IP: {log.ip}</span>
                                      <span>•</span>
                                      <span>{log.location}</span>
                                    </div>
                                    <div className="text-[8px] text-stone-400 font-sans">{log.device}</div>
                                  </div>
                                  <span className="text-stone-400 text-[8px] whitespace-nowrap">{log.timestamp}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR SCANNER & CONVERT TO STANDALONE DESKTOP APP SECTION */}
                  <div className={`border-t pt-4 mt-4 space-y-2.5 ${themeMode === 'dark' ? 'border-stone-800/80' : 'border-stone-150'}`}>
                    
                    <button 
                      type="button" 
                      onClick={() => { playInteractiveSound('click'); setIsQRScannerOpen(true); }}
                      className={`w-full py-2.5 border text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-indigo-950/20 hover:bg-indigo-950/40 border-indigo-900/40 text-indigo-300'
                          : 'bg-indigo-50/50 hover:bg-indigo-100/50 border-indigo-150 text-indigo-800'
                      }`}
                      id="launch-qr-scanner-btn"
                    >
                      <QrCode className="w-4 h-4 animate-pulse" />
                      <span>የተማሪ QR ስካን መግቢያ / አቴንዳንስ</span>
                    </button>

                    {/* Desktop App Conversion Mode Widget */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-stone-50/40 dark:bg-stone-950/40 border-stone-200/80 dark:border-stone-850">
                      <div className="flex items-center gap-2 text-left">
                        <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <span className="text-[10px] font-black text-stone-900 dark:text-white block leading-tight">ወደ Desktop App ቀይር</span>
                          <span className="text-[8px] text-stone-400 block">Use as Application Software</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { playInteractiveSound('click'); setIsDesktopAppModalOpen(true); }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase shrink-0"
                      >
                        ቀይር (Convert)
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* LOGGED IN USER STATUS BANNER */}
                  <div className={`${themeMode === 'dark' ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-900 shadow-xs'} border p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden transition-all duration-200`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-sm font-bold border border-indigo-500 text-white shadow-xs">
                        {currentUser?.role.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className={`${themeMode === 'dark' ? 'text-stone-400' : 'text-stone-500'} text-[10px] font-bold uppercase tracking-wider block`}>የገባው ተጠቃሚ (Current Session)</span>
                        <p className="text-sm font-black flex items-center gap-1.5 flex-wrap">
                          <span>{currentUser?.email}</span>
                          <span className={`px-2 py-0.5 rounded-lg ${themeMode === 'dark' ? 'bg-stone-800 text-indigo-400 border-stone-700' : 'bg-indigo-50 text-indigo-700 border-indigo-100'} text-[10px] font-mono border uppercase font-semibold`}>
                            {currentUser?.role}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => { playInteractiveSound('click'); setIsChangingPasswordOpen(true); }}
                        className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          themeMode === 'dark'
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5 text-indigo-500" />
                        <span>የይለፍ ቃል ቀይር (Change Password)</span>
                      </button>

                      <button 
                        onClick={handleLogout}
                        className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          themeMode === 'dark'
                            ? 'bg-stone-800 hover:bg-stone-700 hover:text-rose-400 text-stone-300 border-stone-700'
                            : 'bg-stone-50 hover:bg-stone-100 hover:text-rose-600 text-stone-700 border-stone-200'
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ውጣ (Logout)</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. PRINCIPAL WORKSPACE (PORTAL & CODES ENHANCED) */}
                  {currentUser?.role === 'principal' && (
                    <div className="space-y-6" id="principal-workspace">

                      {/* Principal Dashboard Overview KPI metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                        
                        {/* KPI 1: Students */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">ጠቅላላ ተማሪዎች (Total Students)</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-stone-900">{students.length}</span>
                              <span className="text-xs text-stone-500 font-medium">ተማሪዎች</span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-semibold block">
                              🙋‍♂️ {students.filter(s => s.gender === 'Male').length} ወንድ | 🙋‍♀️ {students.filter(s => s.gender === 'Female').length} ሴት
                            </span>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>

                        {/* KPI 2: Teachers */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">ጠቅላላ መምህራን (Active Teachers)</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-stone-900">{teachers.length}</span>
                              <span className="text-xs text-stone-500 font-medium">መምህራን</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              🟢 ሁሉም በስራ ላይ (Active status)
                            </span>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                        </div>

                        {/* KPI 3: Subjects */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">የትምህርት አይነቶች (Subjects Setup)</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-stone-900">{schoolConfig.subjects.length}</span>
                              <span className="text-xs text-stone-500 font-medium">ኮርሶች</span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-semibold block">
                              ደረጃ: {schoolConfig.schoolLevel === 'secondary' ? '9-12ኛ ክፍል' : '1-8ኛ ክፍል'}
                            </span>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Layers className="w-5 h-5" />
                          </div>
                        </div>

                        {/* KPI 4: School Performance Average */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">አጠቃላይ አማካይ ውጤት (School GPA Avg)</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-indigo-700">
                                {grades.length > 0 
                                  ? `${Math.round(grades.reduce((sum, g) => sum + g.total, 0) / grades.length)}%` 
                                  : '0%'}
                              </span>
                              <span className="text-xs text-stone-500 font-medium">አማካይ</span>
                            </div>
                            {/* Simple mini-progress bar */}
                            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ 
                                  width: `${grades.length > 0 
                                    ? Math.round(grades.reduce((sum, g) => sum + g.total, 0) / grades.length) 
                                    : 0}%` 
                                }} 
                              />
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <span className="text-lg font-black">📈</span>
                          </div>
                        </div>

                      </div>
                      
                      {/* Principal Sub-tabs menu bar */}
                      <div className="flex overflow-x-auto gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/50 print:hidden">
                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('students'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'students' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>የተማሪዎች ምዝገባ</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('teachers'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'teachers' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>የመምህራን ምዝገባ</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('classes'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'classes' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>የክፍል ትምህርት ምዝገባ</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('notices'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'notices' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span>ማስታወቂያ መለጠፊያ</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('gradetracker'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'gradetracker' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>ውጤት እና ሮስተር</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('reminders'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'reminders' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>የውጤት ማሳሰቢያ</span>
                        </button>

                        <button
                          onClick={() => { playInteractiveSound('click'); setPrincipalSubTab('passwords'); }}
                          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            principalSubTab === 'passwords' 
                              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100/50' 
                              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>የይለፍ ቃል አስተዳደር</span>
                        </button>
                      </div>

                      {/* Content areas based on active principal sub-tab */}
                      <AnimatePresence mode="wait">
                        {principalSubTab === 'students' && (
                          <motion.div
                            key="students-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                          >
                            {/* Register Student Form */}
                            <div className="lg:col-span-5 bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                              <div>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">ርዕሰ መምህር ተግባር</span>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                                  <PlusCircle className="text-indigo-600 w-5 h-5" /> አዲስ ተማሪ ይመዝግቡ
                                </h3>
                                <p className="text-stone-400 text-xs mt-0.5">Register a New Student and Assign Class/Section</p>
                              </div>

                              {principalSuccessMsg && (
                                <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold rounded-xl animate-pulse">
                                  {principalSuccessMsg}
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
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50"
                                    required
                                  />
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ክፍል (Grade):</label>
                                    <select 
                                      value={newStudentGrade}
                                      onChange={(e) => setNewStudentGrade(e.target.value)}
                                      className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                                    >
                                      {activeGradesList.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ሴክሽን (Sec):</label>
                                    <select 
                                      value={newStudentSection}
                                      onChange={(e) => setNewStudentSection(e.target.value)}
                                      className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                                    >
                                      <option>A</option>
                                      <option>B</option>
                                      <option>C</option>
                                      <option>D</option>
                                    </select>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ኢሜል (Parent Email - Optional):</label>
                                    <input 
                                      type="email"
                                      value={newStudentParentEmail}
                                      onChange={(e) => setNewStudentParentEmail(e.target.value)}
                                      placeholder="parent@school.com"
                                      className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50"
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1">የልጁን ውጤት ብቻ እንዲያይ ይደረጋል። (Used for single-child access map)</p>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ስልክ ቁጥር (Parent Phone - Required):</label>
                                    <input 
                                      type="tel"
                                      value={newStudentParentPhone}
                                      onChange={(e) => setNewStudentParentPhone(e.target.value)}
                                      placeholder="0912345678"
                                      className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50 font-mono"
                                      required
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1">የኢትዮጵያ ስልክ መሆን አለበት (09.../07...) (Standard Ethiopian phone)</p>
                                  </div>
                                </div>

                                <button 
                                  type="submit"
                                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                                >
                                  ➕ ተማሪ መዝግብ (Register Student)
                                </button>
                              </form>
                            </div>

                            {/* Registered Students Table */}
                            <div className="lg:col-span-7 bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-100">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                                    <Users className="text-indigo-600 w-5 h-5" /> በሲስተሙ የተመዘገቡ ተማሪዎች ዝርዝር
                                  </h3>
                                  <p className="text-stone-400 text-xs mt-0.5">Live student profile database with section allocation</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">የክፍል ማጣሪያ (Filter):</span>
                                  <select
                                    value={registeredStudentFilter}
                                    onChange={(e) => {
                                      playInteractiveSound('click');
                                      setRegisteredStudentFilter(e.target.value);
                                    }}
                                    className="p-2 border border-stone-200 rounded-xl text-xs font-black focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50 text-stone-800"
                                  >
                                    <option value="all">📍 ሁሉንም ክፍል (All Grades)</option>
                                    {activeGradesList.map(g => (
                                      <option key={g} value={g}>
                                        {g.replace('Grade ', '')}ኛ ክፍል ({g})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                  <thead>
                                    <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold">
                                      <th className="p-3 border-b border-stone-100">መታወቂያ ID</th>
                                      <th className="p-3 border-b border-stone-100">የተማሪ ስም</th>
                                      <th className="p-3 border-b border-stone-100">ክፍል እና ሴክሽን</th>
                                      <th className="p-3 border-b border-stone-100">ጾታ</th>
                                      <th className="p-3 border-b border-stone-100">ዕድሜ</th>
                                      <th className="p-3 border-b border-stone-100 text-center">እርምጃዎች</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...students]
                                      .filter(student => registeredStudentFilter === 'all' || student.grade === registeredStudentFilter)
                                      .sort((a, b) => a.name.localeCompare(b.name, 'am'))
                                      .map((student) => (
                                        <tr key={student.id} className="hover:bg-indigo-50/20 border-b border-stone-100 text-stone-800 transition-colors">
                                          <td className="p-3 font-mono font-bold text-indigo-700 text-xs">{student.id}</td>
                                          <td className="p-3 font-semibold">
                                            <div>{student.name}</div>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                              {student.parentEmail && (
                                                <div className="text-[10px] text-indigo-500 font-mono font-normal flex items-center gap-0.5">
                                                  <span>📧</span> {student.parentEmail}
                                                </div>
                                              )}
                                              {student.parentPhone && (
                                                <div className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-0.5">
                                                  <span>📞</span> {student.parentPhone}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">
                                              {student.grade} - {student.section}
                                            </span>
                                          </td>
                                          <td className="p-3 text-xs">{student.gender === 'Female' ? '👩 ሴት' : '👨 ወንድ'}</td>
                                          <td className="p-3 text-xs font-bold text-stone-600">{student.age ? `${student.age} ዓመት` : '-'}</td>
                                          <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-1.5">
                                              <button
                                                onClick={() => {
                                                  playInteractiveSound('click');
                                                  setSelectedQRStudent(student);
                                                }}
                                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors cursor-pointer"
                                                title="የQR መታወቂያ አውጣ (Generate QR Code Card)"
                                              >
                                                <QrCode className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleOpenEditStudentMain(student)}
                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                                title="ማስተካከል (Edit)"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  playInteractiveSound('wrong');
                                                  setDeletingStudentMainTab(student);
                                                }}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                                title="ማጥፋት (Delete)"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    {students.filter(student => registeredStudentFilter === 'all' || student.grade === registeredStudentFilter).length === 0 && (
                                      <tr>
                                        <td colSpan={6} className="p-6 text-center text-stone-400 text-xs font-medium">
                                          በዚህ ክፍል የተመዘገበ ተማሪ አልተገኘም (No students registered in this grade)
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Automated Parent Email Notification Simulation outbox */}
                            <div className="lg:col-span-12 mt-2">
                              <SimulatedEmailOutbox />
                            </div>
                          </motion.div>
                        )}

                        {principalSubTab === 'teachers' && (
                          <motion.div
                            key="teachers-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <TeacherSection 
                              teachers={teachers} 
                              onAddTeacher={(newTeacher) => setTeachers(prev => [newTeacher, ...prev])} 
                              onEditTeacher={handleEditTeacher}
                              onDeleteTeacher={handleDeleteTeacher}
                              schoolConfig={schoolConfig}
                            />
                          </motion.div>
                        )}

                        {principalSubTab === 'classes' && (
                          <motion.div
                            key="classes-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <ClassSetupSection 
                              classes={classes} 
                              onAddClass={(newClass) => setClasses(prev => [newClass, ...prev])} 
                              onEditClass={handleEditClass}
                              onDeleteClass={handleDeleteClass}
                              schoolConfig={schoolConfig}
                            />
                          </motion.div>
                        )}

                        {principalSubTab === 'notices' && (
                          <motion.div
                            key="notices-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <AnnouncementSection 
                              announcements={announcements} 
                              onAddAnnouncement={(newAnn) => setAnnouncements(prev => [newAnn, ...prev])} 
                              onEditAnnouncement={handleEditAnnouncement}
                              onDeleteAnnouncement={handleDeleteAnnouncement}
                            />
                          </motion.div>
                        )}

                        {principalSubTab === 'gradetracker' && (
                          <motion.div
                            key="gradetracker-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <GradeTrackerSection 
                              students={students} 
                              grades={grades} 
                              teachers={teachers}
                              currentUserEmail={currentUser?.email || ''}
                              schoolConfig={schoolConfig}
                              currentUserRole={currentUser?.role}
                              onSaveGrade={(g) => {
                                setGrades(prev => [g, ...prev.filter(x => !(x.studentId === g.studentId && x.subject === g.subject && (x.term || 1) === (g.term || 1)))]);
                              }}
                              onDeleteGrade={(studentId, subject, term) => {
                                setGrades(prev => prev.filter(x => !(x.studentId === studentId && x.subject === subject && (x.term || 1) === term)));
                              }}
                              onAddStudent={(newStudent) => {
                                setStudents(prev => [newStudent, ...prev]);
                                const targetParentEmail = newStudent.parentEmail || `${newStudent.name.replace(/\s+/g, '_').toLowerCase()}_parent@school.com`;
                                ParentNotificationService.sendRegistrationEmail(
                                  newStudent.name,
                                  newStudent.id,
                                  newStudent.grade,
                                  newStudent.section,
                                  targetParentEmail
                                );
                              }}
                              onEditStudent={handleEditStudent}
                              onDeleteStudent={handleDeleteStudent}
                              onRequestManualPdfLink={(url, filename, title) => {
                                setDownloadablePdf({ url, filename, title });
                              }}
                            />
                          </motion.div>
                        )}

                        {principalSubTab === 'reminders' && (
                          <motion.div
                            key="reminders-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <GradeRemindersSection 
                              students={students}
                              grades={grades}
                              classes={classes}
                              schoolConfig={schoolConfig}
                            />
                          </motion.div>
                        )}

                        {principalSubTab === 'passwords' && (
                          <motion.div
                            key="passwords-subtab"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-6 text-left"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                                  🔑 የይለፍ ቃል እና መለያዎች መቆጣጠሪያ (Credentials & Passwords)
                                </h3>
                                <p className="text-xs text-stone-500 font-medium mt-1">
                                  በሲስተሙ ውስጥ የሚገኙ መምህራንን፣ ወላጆችን እና ርዕሰ መምህሩን መለያዎች እና የይለፍ ቃላት እዚህ መቆጣጠር ይችላሉ። ተጠቃሚዎች ቃላቸውን ሲቀይሩ እዚህ ይታያል።
                                </p>
                              </div>
                              <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[11px] p-3 rounded-2xl font-bold">
                                🔒 ማስታወሻ፡ ይህ መቆጣጠሪያ ለርዕሰ መምህሩ ብቻ የተፈቀደ የደህንነት ገጽ ነው።
                              </div>
                            </div>

                            {/* Credentials Filter */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                              <div>
                                <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">ፈልግ (Search User)</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="በስም ወይም በኢሜል ፈልግ..."
                                    className="w-full bg-white border border-stone-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-stone-800 font-semibold pl-8"
                                    onChange={(e) => {
                                      const val = e.target.value.toLowerCase();
                                      (window as any)._passwordsFilter = val;
                                      setUserAccounts([...userAccounts]); // force re-render
                                    }}
                                  />
                                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-stone-500 block mb-1 uppercase">በሚና ለይ (Filter by Role)</label>
                                <select
                                  className="w-full bg-white border border-stone-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-stone-800 font-bold"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    (window as any)._passwordsRoleFilter = val;
                                    setUserAccounts([...userAccounts]); // force re-render
                                  }}
                                >
                                  <option value="all">ሁሉንም ተጠቃሚዎች (All Users)</option>
                                  <option value="principal">ርዕሰ መምህር (Principal)</option>
                                  <option value="teacher">መምህራን (Teachers)</option>
                                  <option value="parent">ወላጆች (Parents)</option>
                                </select>
                              </div>
                            </div>

                            {/* Credentials Table */}
                            <div className="overflow-x-auto border border-stone-150 rounded-2xl">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-stone-50 text-stone-500 text-[10px] uppercase font-black tracking-wider border-b border-stone-150">
                                    <th className="p-3">ተጠቃሚ (Name)</th>
                                    <th className="p-3">ኢሜል (Email / Username)</th>
                                    <th className="p-3">ሚና (Role)</th>
                                    <th className="p-3">የይለፍ ቃል (Password)</th>
                                    <th className="p-3 text-center">እርምጃዎች (Actions)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {userAccounts
                                    .filter(acc => {
                                      const query = (window as any)._passwordsFilter || '';
                                      const roleF = (window as any)._passwordsRoleFilter || 'all';
                                      const matchesQuery = acc.name.toLowerCase().includes(query) || acc.email.toLowerCase().includes(query);
                                      const matchesRole = roleF === 'all' || acc.role === roleF;
                                      return matchesQuery && matchesRole;
                                    })
                                    .map(acc => (
                                      <tr key={acc.email} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="p-3 text-xs font-bold text-stone-800">{acc.name}</td>
                                        <td className="p-3 text-xs font-mono font-semibold text-stone-600">{acc.email}</td>
                                        <td className="p-3 text-xs">
                                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-mono border uppercase font-bold ${
                                            acc.role === 'principal' 
                                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                                              : acc.role === 'teacher'
                                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                          }`}>
                                            {acc.role === 'principal' ? '👨‍💼 Principal' : acc.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍👩‍👧 Parent'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-xs font-mono">
                                          <span className="bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg text-stone-800 font-black border border-stone-200 select-all transition-colors inline-block cursor-pointer">
                                            {acc.password || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-xs text-center space-x-1.5 whitespace-nowrap">
                                          <button
                                            onClick={() => {
                                              playInteractiveSound('click');
                                              const defaultPass = acc.role === 'principal' ? 'Principal123' : acc.role === 'teacher' ? 'Teacher123' : 'Parent123';
                                              const confirmReset = window.confirm(`የ${acc.name} የይለፍ ቃል ወደ መጀመሪያው (${defaultPass}) ለመመለስ እርግጠኛ ነዎት?`);
                                              if (confirmReset) {
                                                setUserAccounts(prev => prev.map(a => a.email === acc.email ? { ...a, password: defaultPass } : a));
                                                playInteractiveSound('success');
                                              }
                                            }}
                                            className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                          >
                                            ይለፍ ቃል መልስ (Reset)
                                          </button>

                                          <button
                                            onClick={() => {
                                              playInteractiveSound('click');
                                              const newP = window.prompt(`የ${acc.name} አዲስ የይለፍ ቃል ያስገቡ (Enter new password):`, acc.password);
                                              if (newP !== null && newP.trim() !== '') {
                                                setUserAccounts(prev => prev.map(a => a.email === acc.email ? { ...a, password: newP.trim() } : a));
                                                playInteractiveSound('success');
                                              }
                                            }}
                                            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                          >
                                            ቀይር (Edit)
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  )}

                  {/* 2. TEACHER WORKSPACE */}
                  {currentUser?.role === 'teacher' && (
                    <div className="col-span-full space-y-6" id="teacher-workspace">
                      {/* Teacher Workspace Header and Subtabs */}
                      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 border border-stone-750 shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">የመምህራን የክፍል መቆጣጠሪያ / Teacher Portal</span>
                          <h2 className="text-xl font-black tracking-tight font-sans">እንኳን በደህና መጡ፣ መምህር! 👋</h2>
                          <p className="text-stone-300 text-xs">ከተማሪዎችዎ የውጤት መዛግብት፣ ማርክ ሊስት እና ሮስተሮች ጋር እዚህ በምቾት ይስሩ።</p>
                        </div>
                        <div className="flex gap-2 flex-wrap shrink-0 bg-white/5 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => { playInteractiveSound('click'); setTeacherSubTab('class-sheets'); }}
                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                              teacherSubTab === 'class-sheets'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-stone-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> ሁሉን-አቀፍ ክፍል መቆጣጠሪያ (Class Sheets)
                          </button>
                          <button
                            onClick={() => { playInteractiveSound('click'); setTeacherSubTab('quick-entry'); }}
                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                              teacherSubTab === 'quick-entry'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-stone-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" /> ነጠላ ውጤት መመዝገቢያ (Quick Entry)
                          </button>
                        </div>
                      </div>

                      {teacherSubTab === 'class-sheets' && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-100 pb-4">
                            <div>
                              <h3 className="text-lg font-extrabold text-stone-950 flex items-center gap-2">
                                <FileSpreadsheet className="text-emerald-600 w-5 h-5" /> የክፍል ማርክ ሊስት እና ሮስተር ማስተዳደሪያ
                              </h3>
                              <p className="text-xs text-stone-500 mt-0.5">
                                እዚህ ላይ በክፍል እና በሴክሽን በመለየት የተማሪዎችን ውጤት መሙላት፣ ማረም፣ ማስተካከል እና ማተም/ማውረድ ይችላሉ።
                              </p>
                            </div>
                          </div>
                          
                          <GradeTrackerSection
                            students={students}
                            grades={grades}
                            teachers={teachers}
                            currentUserEmail={currentUser?.email || ''}
                            schoolConfig={schoolConfig}
                            currentUserRole="teacher"
                            onSaveGrade={(newGrade) => {
                              setGrades(prev => {
                                const existsIdx = prev.findIndex(g => g.studentId === newGrade.studentId && g.subject === newGrade.subject && (g.term || 1) === (newGrade.term || 1));
                                if (existsIdx !== -1) {
                                  const copy = [...prev];
                                  copy[existsIdx] = newGrade;
                                  return copy;
                                } else {
                                  return [newGrade, ...prev];
                                }
                              });
                            }}
                            onDeleteGrade={(studentId, subject, term) => {
                              setGrades(prev => prev.filter(x => !(x.studentId === studentId && x.subject === subject && (x.term || 1) === term)));
                            }}
                            onAddStudent={(newStudent) => {
                              setStudents(prev => [newStudent, ...prev]);
                              
                              // Send simulated email notification to the parent
                              const targetParentEmail = newStudent.parentEmail || `${newStudent.name.replace(/\s+/g, '_').toLowerCase()}_parent@school.com`;
                              ParentNotificationService.sendRegistrationEmail(
                                newStudent.name,
                                newStudent.id,
                                newStudent.grade,
                                newStudent.section,
                                targetParentEmail
                              );
                            }}
                            onEditStudent={handleEditStudent}
                            onDeleteStudent={handleDeleteStudent}
                            onRequestManualPdfLink={(url, filename, title) => {
                              setDownloadablePdf({ url, filename, title });
                            }}
                          />
                        </motion.div>
                      )}

                      {teacherSubTab === 'quick-entry' && (() => {
                        const assessments = getSubjectAssessments(selectedTeacherSubject);
                        const quizMax = assessments.find(a => a.id === 'quiz')?.maxMark ?? 10;
                        const cwMax = assessments.find(a => a.id === 'cw')?.maxMark ?? 10;
                        const hwMax = assessments.find(a => a.id === 'hw')?.maxMark ?? 10;
                        const midMax = assessments.find(a => a.id === 'mid')?.maxMark ?? 20;
                        const finalMax = assessments.find(a => a.id === 'final')?.maxMark ?? 50;
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* Grade Input Form */}
                            <div className="lg:col-span-5 bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                                  <PlusCircle className="text-emerald-600 w-5 h-5" /> የተማሪ ውጤት መዝግብ (Teacher Grade Entry)
                                </h3>
                                <p className="text-stone-400 text-xs mt-0.5">Secure grade logging linked to unique student IDs</p>
                              </div>

                              {teacherSuccessMsg && (
                                <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold rounded-xl">
                                  {teacherSuccessMsg}
                                </div>
                              )}

                              {teacherErrorMsg && (
                                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-100 text-xs font-semibold rounded-xl">
                                  {teacherErrorMsg}
                                </div>
                              )}

                              <form onSubmit={handleSaveGrade} className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">ተማሪ ይምረጡ (Select Student):</label>
                                  <select 
                                    value={selectedStudentId}
                                    onChange={(e) => { playInteractiveSound('click'); setSelectedStudentId(e.target.value); }}
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-semibold text-stone-800"
                                    required
                                  >
                                    <option value="">-- ተማሪ ይምረጡ (Select Student) --</option>
                                    {[...selectableStudents].sort((a, b) => a.name.localeCompare(b.name, 'am')).map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({s.id}) - {s.grade} {s.section}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[10px] text-indigo-600 font-mono mt-1 block">
                                    📌 ማሻሻያ፡ ውጤቱ የሚገናኘው ከተማሪው ID ጋር ብቻ ነው (Fixes Student Name typos)
                                  </span>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">የምዘገባ ትምህርት አይነት (Select Subject):</label>
                                  <select 
                                    value={selectedTeacherSubject}
                                    onChange={(e) => { playInteractiveSound('click'); setSelectedTeacherSubject(e.target.value); }}
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-semibold text-stone-800"
                                    required
                                  >
                                    {selectableTeacherSubjects.map(sub => (
                                      <option key={sub} value={sub}>
                                        📚 {sub}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">የምዘገባ የጊዜ ዑደት (Select Term / Period):</label>
                                  <select 
                                    value={teacherSelectedTerm}
                                    onChange={(e) => { playInteractiveSound('click'); setTeacherSelectedTerm(Number(e.target.value)); }}
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-semibold text-stone-800"
                                    required
                                  >
                                    {(schoolConfig.evaluationMode || 'quarter') === 'semester' ? (
                                      <>
                                        <option value={1}>ሴሚስተር 1 (Semester 1)</option>
                                        <option value={2}>ሴሚስተር 2 (Semester 2)</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value={1}>ሩብ ዓመት 1 (Quarter 1)</option>
                                        <option value={2}>ሩብ ዓመት 2 (Quarter 2)</option>
                                        <option value={3}>ሩብ ዓመት 3 (Quarter 3)</option>
                                        <option value={4}>ሩብ ዓመት 4 (Quarter 4)</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">ኩዊዝ (Quiz - Max {quizMax}):</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={quizMax}
                                      value={quizScore}
                                      onChange={(e) => setQuizScore(e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="0"
                                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">ክፍል ስራ (CW - Max {cwMax}):</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={cwMax}
                                      value={cwScore}
                                      onChange={(e) => setCwScore(e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="0"
                                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50"
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">የቤት ስራ (HW - Max {hwMax}):</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={hwMax}
                                      value={hwScore}
                                      onChange={(e) => setHwScore(e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="0"
                                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">ግማሽ ፈተና (Mid - Max {midMax}):</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={midMax}
                                      value={midScore}
                                      onChange={(e) => setMidScore(e.target.value === '' ? '' : Number(e.target.value))}
                                      placeholder="0"
                                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50"
                                      required
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">ማጠቃለያ ፈተና (Final - Max {finalMax}):</label>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max={finalMax}
                                    value={finalScore}
                                    onChange={(e) => setFinalScore(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50"
                                    required
                                  />
                                </div>

                                <button 
                                  type="submit"
                                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                                >
                                  💾 ውጤቱን መዝግብ (Save Grade Results)
                                </button>
                              </form>
                            </div>

                            {/* Grades list table */}
                            <div className="lg:col-span-7 bg-white border border-stone-200 p-6 rounded-2xl space-y-4 shadow-xs">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                                  <FileSpreadsheet className="text-emerald-600 w-5 h-5" /> የተመዘገቡ ውጤቶች ታሪክ
                                </h3>
                                <p className="text-stone-400 text-xs mt-0.5">Your recorded grade history database</p>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                  <thead>
                                    <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold">
                                      <th className="p-3 border-b border-stone-100">ተማሪ</th>
                                      <th className="p-3 border-b border-stone-100 text-center">Quiz</th>
                                      <th className="p-3 border-b border-stone-100 text-center">CW</th>
                                      <th className="p-3 border-b border-stone-100 text-center">HW</th>
                                      <th className="p-3 border-b border-stone-100 text-center">Mid</th>
                                      <th className="p-3 border-b border-stone-100 text-center">Final</th>
                                      <th className="p-3 border-b border-stone-100 text-center">ጠቅላላ (Total)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {grades.map((g) => {
                                      const st = students.find(s => s.id === g.studentId);
                                      return (
                                        <tr key={g.id} className="hover:bg-emerald-50/10 border-b border-stone-100 text-stone-800 transition-colors">
                                          <td className="p-3 font-semibold text-stone-900">
                                            <div className="flex flex-col">
                                              <span>{g.studentName}</span>
                                              <div className="flex gap-1.5 items-center mt-0.5 flex-wrap">
                                                <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1 py-0.2 rounded">
                                                  {g.studentId} {st ? `(${st.grade}-${st.section})` : ''}
                                                </span>
                                                <span className="font-sans text-[10px] text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                                  📚 {g.subject || 'Mathematics'}
                                                </span>
                                                <span className="font-sans text-[10px] text-amber-700 font-black bg-amber-50 px-1.5 py-0.2 rounded-md">
                                                  🕒 {(schoolConfig.evaluationMode || 'quarter') === 'semester' ? `Sem ${g.term || 1}` : `Q${g.term || 1}`}
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="p-3 text-center text-xs font-medium text-stone-600">{g.quiz}/{quizMax}</td>
                                          <td className="p-3 text-center text-xs font-medium text-stone-600">{g.cw}/{cwMax}</td>
                                          <td className="p-3 text-center text-xs font-medium text-stone-600">{g.hw}/{hwMax}</td>
                                          <td className="p-3 text-center text-xs font-medium text-stone-600">{g.mid}/{midMax}</td>
                                          <td className="p-3 text-center text-xs font-medium text-stone-600">{g.final}/{finalMax}</td>
                                          <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-lg font-bold text-xs ${
                                              g.total >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                              g.total >= 60 ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                                              'bg-rose-50 text-rose-800 border border-rose-100'
                                            }`}>
                                              {g.total}%
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 3. PARENT REPORT CARD WORKSPACE */}
                  {currentUser?.role === 'parent' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="parent-workspace">
                      
                      {/* Search panel card */}
                      <div className="lg:col-span-4 bg-white border border-stone-200 p-6 rounded-2xl space-y-6 shadow-xs">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Search className="text-amber-500 w-6 h-6" /> የልጅዎን ውጤት ይፈልጉ
                          </h3>
                          <p className="text-stone-400 text-xs mt-0.5">Enter student’s unique ID to fetch authenticated report card</p>
                        </div>

                        <form onSubmit={handleSearchStudent} className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                            <input 
                              type="text"
                              value={searchId}
                              onChange={(e) => setSearchId(e.target.value)}
                              placeholder="መታወቂያ ያስገቡ (e.g. ID-4021)"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-stone-50/50 uppercase font-mono font-bold"
                              required
                            />
                          </div>
                          <button 
                            type="submit"
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                          >
                            ፈልግ
                          </button>
                        </form>

                        {/* Parent Error Message Display */}
                        {parentErrorMsg && (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-800 font-semibold space-y-1">
                            {parentErrorMsg}
                          </div>
                        )}

                        {/* Child Information Card / Help Desk */}
                        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-xs space-y-1.5">
                          <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">🔒 ፈቃድ እና ማረጋገጫ (Authorization Info)</span>
                          {(() => {
                            const children = students.filter(s => s.parentEmail?.trim().toLowerCase() === currentUser?.email?.trim().toLowerCase());
                            if (children.length > 0) {
                              return (
                                <div className="text-stone-600 space-y-2">
                                  <p className="font-semibold text-stone-700">የልጆችዎ ዝርዝር (Your Children List):</p>
                                  <div className="flex flex-col gap-2 mt-1">
                                    {children.map(c => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          playInteractiveSound('click');
                                          setSearchId(c.id);
                                          setParentSearched(true);
                                          setParentErrorMsg(null);
                                          setFoundStudent(c);
                                          const childGrades = grades.filter(g => g.studentId === c.id);
                                          setFoundGrades(childGrades);
                                        }}
                                        className={`border font-mono text-xs px-3 py-2 rounded-xl font-bold transition-all shadow-xs flex items-center gap-2 text-left w-full ${
                                          searchId.trim().toUpperCase() === c.id.toUpperCase()
                                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                                            : 'bg-white border-amber-200 text-indigo-700 hover:border-indigo-500'
                                        }`}
                                      >
                                        <span>🔑</span>
                                        <div>
                                          <span className="font-black text-indigo-900">{c.id}</span> - <span className="font-sans font-semibold text-stone-700">{c.name}</span>
                                          <span className="text-[10px] text-stone-400 font-sans block font-normal mt-0.5">{c.grade} - ሴክሽን {c.section}</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-stone-400 mt-1.5 italic">※ የደህንነት መመሪያ፡ ወላጅ ማየት የሚችለው የራሱን ልጅ ውጤት ብቻ ነው። (Security policy: parents can only view their own child's report card.)</p>
                                </div>
                              );
                            } else {
                              return (
                                <p className="text-stone-500 italic">ከእርስዎ የኢሜል አድራሻ ጋር የተገናኘ ተማሪ የለም። እባክዎን ርዕሰ መምህሩን ያነጋግሩ። (No student is linked to your email address.)</p>
                              );
                            }
                          })()}
                        </div>
                      </div>

                      {/* Parent search results canvas */}
                      <div className="lg:col-span-8 bg-white border border-stone-200 p-6 rounded-2xl shadow-xs min-h-[300px]">
                        <AnimatePresence mode="wait">
                          {parentSearched ? (
                            <motion.div
                              key={searchId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-6"
                            >
                              {foundStudent ? (
                                <div className="space-y-6">
                                  {/* Student profile and metadata info bar */}
                                  <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                      <span className="text-indigo-800 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">📄 የተማሪው ማህደር (Student Profile)</span>
                                      <h4 className="text-xl font-extrabold text-stone-900 dark:text-stone-50 mt-2 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {foundStudent.name}
                                      </h4>
                                      <p className="text-stone-500 dark:text-stone-400 text-xs font-semibold mt-1">
                                        ጾታ፡ <span className="text-stone-800 dark:text-stone-200 font-bold">{foundStudent.gender === 'Male' ? 'ወንድ' : 'ሴት'}</span> • ክፍል፡ <span className="text-stone-800 dark:text-stone-200 font-bold">{foundStudent.grade} - {foundStudent.section}</span>
                                      </p>
                                    </div>
                                    <div className="sm:text-right bg-stone-50/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end">
                                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase block">ልዩ መታወቂያ (ID)</span>
                                      <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 text-lg tracking-wider">{foundStudent.id}</span>
                                    </div>
                                  </div>

                                  {/* Parent tab switchers (ውጤት, ማስታወቂያ, አቴንዳንስ) */}
                                  <div className="flex border-b border-stone-200 dark:border-stone-800 pb-px gap-1 overflow-x-auto">
                                    <button
                                      type="button"
                                      onClick={() => { playInteractiveSound('click'); setParentSubView('grades'); }}
                                      className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all -mb-px shrink-0 ${
                                        parentSubView === 'grades'
                                          ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-indigo-600 dark:text-indigo-400 border-b-white dark:border-b-stone-900 z-10'
                                          : 'bg-stone-50/60 dark:bg-stone-950/40 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-900/40'
                                      }`}
                                    >
                                      📚 የልጅዎ ውጤት (Grades & Report Card)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { playInteractiveSound('click'); setParentSubView('notices'); }}
                                      className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all -mb-px shrink-0 ${
                                        parentSubView === 'notices'
                                          ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-indigo-600 dark:text-indigo-400 border-b-white dark:border-b-stone-900 z-10'
                                          : 'bg-stone-50/60 dark:bg-stone-950/40 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-900/40'
                                      }`}
                                    >
                                      📢 የትምህርት ቤት ማስታወቂያዎች (School Notices)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { playInteractiveSound('click'); setParentSubView('attendance'); }}
                                      className={`px-4 py-2.5 text-xs font-black rounded-t-xl border-t border-x transition-all -mb-px shrink-0 ${
                                        parentSubView === 'attendance'
                                          ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-indigo-600 dark:text-indigo-400 border-b-white dark:border-b-stone-900 z-10'
                                          : 'bg-stone-50/60 dark:bg-stone-950/40 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-900/40'
                                      }`}
                                    >
                                      📅 የመቅረትና የአቴንዳንስ ሁኔታ (Attendance & Conduct)
                                    </button>
                                  </div>

                                  {parentSubView === 'grades' && (
                                    <div className="space-y-6">
                                      {/* GPA Summary Card */}
                                      {(() => {
                                        let gpaSum = 0;
                                        let gpaCount = 0;
                                        schoolConfig.subjects.forEach(sub => {
                                          const annual = getSubjectAnnualAvg(sub);
                                          if (annual !== null) {
                                            gpaSum += annual;
                                            gpaCount++;
                                          }
                                        });
                                        const gpaAvg = gpaCount > 0 ? Math.round(gpaSum / gpaCount) : 0;
                                        
                                        return (
                                          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-850 text-white p-5 rounded-2xl shadow-md border border-indigo-500/20 flex items-center justify-between max-w-sm hover:scale-[1.01] transition-transform duration-300">
                                            <div className="space-y-1">
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 block">የልጅዎ ዓመታዊ አማካይ ውጤት (Annual Average)</span>
                                              <p className="text-2xl font-black">
                                                {gpaCount > 0 ? `${gpaAvg}%` : '--%'}
                                              </p>
                                              <span className="text-[10px] bg-white/20 dark:bg-stone-900/40 text-white dark:text-stone-100 px-2 py-0.5 rounded-md font-bold inline-block border border-white/10">
                                                {gpaCount > 0 ? (
                                                  gpaAvg >= 85 ? '🌟 እጅግ በጣም ጥሩ (Excellent)' :
                                                  gpaAvg >= 60 ? '👍 ማለፊያ (Passing)' :
                                                  '⚠️ እገዛ ያስፈልጋል (Needs Support)'
                                                ) : 'ውጤት አልተመዘገበም'}
                                              </span>
                                            </div>
                                            <div className="bg-white/10 dark:bg-stone-900/30 p-2.5 rounded-xl shrink-0 border border-white/5">
                                              <Award className="w-7 h-7 text-indigo-100" />
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Unified Report Card Scorecard (All subjects in ONE view) */}
                                      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden space-y-4">
                                        <div className="bg-stone-50/80 dark:bg-stone-950/40 p-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center flex-wrap gap-2">
                                          <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">📓 የትምህርት ዘገባ ሰሌዳ (Unified Scorecard)</h4>
                                            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-semibold mt-0.5">ሁሉም የሚማሯቸው ትምህርቶች በአንድ ገፅ</p>
                                          </div>
                                          
                                          <button
                                            type="button"
                                            onClick={() => { playInteractiveSound('success'); setShowPrintModal(true); }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-indigo-100 dark:shadow-none hover:scale-[1.02]"
                                          >
                                            <span>🖨️ የውጤት ካርድ አትም (Print Report Card)</span>
                                          </button>
                                        </div>

                                        {foundGrades.length > 0 ? (
                                          <div className="p-4 pt-1 space-y-4">
                                            <div className="overflow-x-auto rounded-xl border border-stone-200/80 dark:border-stone-800/80 shadow-3xs bg-white dark:bg-stone-900">
                                              <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                                                <thead>
                                                  <tr className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 uppercase font-black text-[10px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                                                    <th className="p-3 text-stone-900 dark:text-stone-100 font-extrabold w-48">📚 የትምህርት አይነት (Subject)</th>
                                                    <th className="p-3 text-center w-36">Sem1 AVR (100)</th>
                                                    <th className="p-3 text-center w-36">Sem2 AVR (100)</th>
                                                    <th className="p-3 text-center w-36 bg-indigo-50/30 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-300">Annual AVR (100)</th>
                                                    <th className="p-3 text-center w-28">Grade</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                                  {schoolConfig.subjects.map((sub) => {
                                                    const s1 = getSubjectSem1Avg(sub);
                                                    const s2 = getSubjectSem2Avg(sub);
                                                    const annual = getSubjectAnnualAvg(sub);
                                                    const lg = annual !== null ? getLetterGrade(annual) : null;
                                                    
                                                    // Find teacher name if available
                                                    const matchTeacher = foundGrades.find(g => g.subject === sub)?.teacher || '';
                                                    
                                                    return (
                                                      <tr key={sub} className="hover:bg-stone-50/50 dark:hover:bg-stone-950/30 text-stone-800 dark:text-stone-200 transition-colors">
                                                        <td className="p-3 font-bold text-stone-900 dark:text-stone-50">
                                                          <div className="flex flex-col">
                                                            <span className="text-sm font-black text-stone-950 dark:text-stone-50">{sub}</span>
                                                            {matchTeacher && (
                                                              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-normal">መምህር (Instructor)፡ {matchTeacher.split('@')[0]}</span>
                                                            )}
                                                          </div>
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-stone-600 dark:text-stone-400 whitespace-nowrap">
                                                          {s1 !== null ? `${s1}%` : <span className="text-stone-300 dark:text-stone-700">-</span>}
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-stone-600 dark:text-stone-400 whitespace-nowrap">
                                                          {s2 !== null ? `${s2}%` : <span className="text-stone-300 dark:text-stone-700">-</span>}
                                                        </td>
                                                        <td className="p-3 text-center font-extrabold text-indigo-950 dark:text-indigo-300 whitespace-nowrap bg-indigo-50/20 dark:bg-indigo-950/10 shadow-inner">
                                                          {annual !== null ? `${annual}%` : <span className="text-stone-300 dark:text-stone-700">-</span>}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                          {lg ? (
                                                            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${lg.color} whitespace-nowrap`}>
                                                              {lg.label}
                                                            </span>
                                                          ) : (
                                                            <span className="text-stone-300 dark:text-stone-700">-</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-center p-8 bg-stone-50 dark:bg-stone-950/20 border border-stone-200/50 dark:border-stone-800/60 rounded-2xl mx-4 mb-4">
                                            <Info className="w-8 h-8 text-amber-500 mx-auto" />
                                            <p className="text-stone-600 dark:text-stone-300 text-sm font-medium mt-2">ለተማሪ &ldquo;{foundStudent.name}&rdquo; እስካሁን ምንም ውጤት አልተመዘገበም (No grades entered yet)</p>
                                            <p className="text-stone-400 dark:text-stone-500 text-xs">እባክዎን አስተማሪው ውጤት እስኪያስገባ ድረስ ይጠብቁ።</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {parentSubView === 'notices' && (
                                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-2xl space-y-4">
                                      <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                                        <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-sm uppercase text-stone-700 dark:text-stone-300 font-black tracking-wider">
                                          📢 የማስታወቂያ ሰሌዳ (Notice Board)
                                        </h4>
                                      </div>

                                      {announcements.filter(ann => ann.target === 'Parents' || ann.target === 'Both').length > 0 ? (
                                        <div className="space-y-4">
                                          {announcements.filter(ann => ann.target === 'Parents' || ann.target === 'Both').map((ann) => (
                                            <div key={ann.id} className="bg-stone-50/50 dark:bg-stone-950/30 border border-stone-200 dark:border-stone-800 p-5 rounded-xl space-y-3 hover:bg-stone-50/80 dark:hover:bg-stone-950/50 transition-all shadow-3xs">
                                              <div className="flex justify-between items-start gap-2">
                                                <h5 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm leading-tight">
                                                  📌 {ann.title}
                                                </h5>
                                                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono font-bold shrink-0 bg-stone-100 dark:bg-stone-900 px-2 py-0.5 rounded border border-stone-200/20">
                                                  {new Date(ann.timestamp).toLocaleDateString('am-ET', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                              </div>
                                              <p className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
                                                {ann.content}
                                              </p>
                                              <div className="flex justify-between items-center pt-2 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400 dark:text-stone-500 font-semibold">
                                                <span>የተላከው በ፡ {ann.postedBy.split('@')[0]}</span>
                                                <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-450 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase border border-indigo-100/35">
                                                  ለወላጆች
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-12 text-stone-400 dark:text-stone-500 text-xs italic bg-stone-50 dark:bg-stone-950/20 rounded-xl border border-stone-150 dark:border-stone-850">
                                          አሁን ምንም አዲስ ማስታወቂያ የለም (No notices currently)
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {parentSubView === 'attendance' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Left block - Status cards */}
                                      <div className="space-y-4">
                                        {/* Attendance Summary Card */}
                                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-amber-550/20">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">የመቅረት ሁኔታ (Attendance)</span>
                                            <p className="text-2xl font-black">{studentExtraInfo[foundStudent.id]?.absent ?? 0} ቀናት ቀርተዋል</p>
                                            <span className="text-[10px] bg-white/20 dark:bg-stone-900/40 text-white dark:text-stone-200 px-2 py-0.5 rounded-md font-bold inline-block border border-white/10">
                                              {(studentExtraInfo[foundStudent.id]?.absent ?? 0) === 0 ? '💯 ሙሉ መገኘት (Perfect)' : 'ቀሪ ቀናት ተመዝግቧል'}
                                            </span>
                                          </div>
                                          <div className="bg-white/10 dark:bg-stone-900/30 p-2.5 rounded-xl shrink-0 border border-white/5">
                                            <UserCheck className="w-7 h-7 text-amber-100" />
                                          </div>
                                        </div>

                                        {/* Conduct Summary Card */}
                                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-emerald-550/20">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">የምግባር ደረጃ (Conduct)</span>
                                            <p className="text-2xl font-black">ውጤት: {studentExtraInfo[foundStudent.id]?.conduct ?? 'A'}</p>
                                            <span className="text-[10px] bg-white/20 dark:bg-stone-900/40 text-white dark:text-stone-200 px-2 py-0.5 rounded-md font-bold inline-block border border-white/10">
                                              ስነ-ምግባር (Behavior Assessment)
                                            </span>
                                          </div>
                                          <div className="bg-white/10 dark:bg-stone-900/30 p-2.5 rounded-xl shrink-0 border border-white/5">
                                            <ShieldCheck className="w-7 h-7 text-emerald-100" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right block - Policy and details */}
                                      <div className="bg-gradient-to-br from-amber-50/30 to-orange-50/20 dark:from-amber-950/10 dark:to-orange-950/5 border border-amber-100 dark:border-amber-900/40 p-5 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-2 border-b border-amber-100 dark:border-amber-900/30 pb-3">
                                          <Info className="w-4.5 h-4.5 text-amber-500" />
                                          <h4 className="text-xs uppercase text-stone-500 dark:text-stone-400 font-black tracking-wider">
                                            📅 የአቴንዳንስ እና ባህሪ ማሳሰቢያ
                                          </h4>
                                        </div>

                                        <div className="space-y-3.5">
                                          <div className="bg-white/80 dark:bg-stone-900/80 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800/60">
                                            <h5 className="font-extrabold text-stone-800 dark:text-stone-200 text-xs">💡 መቅረት ስለመመዝገብ፡</h5>
                                            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed mt-1">
                                              ተማሪዎች ያለ በቂ ምክንያት ትምህርት ቤት እንዳይቀሩ ወላጆች በቅርብ እንዲከታተሉ በትህትና እናሳስባለን። የቀረበት ቀን በሮስተር ላይ ተጽዕኖ ይኖረዋል።
                                            </p>
                                          </div>

                                          <div className="bg-white/80 dark:bg-stone-900/80 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800/60">
                                            <h5 className="font-extrabold text-stone-800 text-xs">🛡️ የምግባር ደረጃ ፖሊሲ፡</h5>
                                            <p className="text-stone-600 text-[11px] leading-relaxed mt-1">
                                              የትምህርት ቤታችን የምግባር ደረጃ (Conduct) በየጊዜው የሚመዘገብ ሲሆን የልጅዎ የምግባር ውጤት <span className="font-extrabold text-indigo-700">{studentExtraInfo[foundStudent.id]?.conduct ?? 'A'}</span> ሆኖ ተመዝግቧል።
                                            </p>
                                          </div>

                                          <p className="text-[10px] text-stone-400 italic">
                                            💬 ማሳሰቢያ፡ ተጨማሪ መረጃ ለማግኘት ትምህርት ቤቱን ወይም የልጅዎን ክፍል ኃላፊ መምህር ማነጋገር ይችላሉ።
                                          </p>
                                        </div>
                                      </div>

                                      {/* Daily Attendance History list */}
                                      {(() => {
                                        const history = (() => {
                                          if (!foundStudent) return [];
                                          try {
                                            const saved = JSON.parse(localStorage.getItem('dailyAttendance') || '{}');
                                            const list: { date: string; status: 'present' | 'absent' | 'excused' }[] = [];
                                            Object.keys(saved).forEach((dateStr) => {
                                              const dayRecord = saved[dateStr];
                                              if (dayRecord && dayRecord[foundStudent.id]) {
                                                list.push({
                                                  date: dateStr,
                                                  status: dayRecord[foundStudent.id],
                                                });
                                              }
                                            });
                                            return list.sort((a, b) => b.date.localeCompare(a.date));
                                          } catch (e) {
                                            return [];
                                          }
                                        })();

                                        return (
                                          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl space-y-4 md:col-span-2 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center border-b border-stone-100 dark:border-stone-800 pb-3 justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                <h4 className="text-sm uppercase text-stone-700 dark:text-stone-300 font-black tracking-wider">
                                                  🗓️ ዝርዝር የእለታዊ አቴንዳንስ መዝገብ (Daily Attendance History Log)
                                                </h4>
                                              </div>
                                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                                {history.length > 0 && (
                                                  <button
                                                    onClick={() => handleExportAttendancePDF(foundStudent, history)}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                  >
                                                    <Printer className="w-3.5 h-3.5" /> ፒዲኤፍ አውርድ (Export PDF)
                                                  </button>
                                                )}
                                                <span className="text-[10px] bg-stone-100 dark:bg-stone-950/60 border border-stone-200/50 dark:border-stone-800 px-2.5 py-1.5 rounded-md font-mono text-stone-500 font-bold">
                                                  ብዛት፡ {history.length} ቀናት
                                                </span>
                                              </div>
                                            </div>

                                            {history.length > 0 ? (
                                              <div className="overflow-x-auto rounded-xl border border-stone-150 dark:border-stone-800 shadow-3xs bg-white dark:bg-stone-900">
                                                <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                                                  <thead>
                                                    <tr className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 uppercase font-black text-[10px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                                                      <th className="p-3">📅 ቀን በአውሮፓውያን (Gregorian Date)</th>
                                                      <th className="p-3">🇪🇹 ቀን በኢትዮጵያ (Ethiopian Date)</th>
                                                      <th className="p-3 text-center">ሁኔታ (Status)</th>
                                                      <th className="p-3 text-center">ምልክት (Symbol)</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                                    {history.map((h, i) => {
                                                      const dateObj = new Date(h.date + 'T12:00:00');
                                                      const dual = getFormattedDualCalendarDate(dateObj);
                                                      return (
                                                        <tr key={i} className="hover:bg-stone-50/50 dark:hover:bg-stone-950/30 transition-colors">
                                                          <td className="p-3 font-semibold text-stone-700 dark:text-stone-300 font-mono">
                                                            {dual.gc}
                                                          </td>
                                                          <td className="p-3 font-extrabold text-stone-900 dark:text-stone-100">
                                                            {dual.ec}
                                                          </td>
                                                          <td className="p-3 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${
                                                              h.status === 'present' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60' :
                                                              h.status === 'absent' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60 font-bold animate-pulse' :
                                                              'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60'
                                                            }`}>
                                                              {h.status === 'present' ? '✓ የመጣ (Present)' :
                                                               h.status === 'absent' ? '✗ የቀረ (Absent)' :
                                                               '✏ ፈቃድ (Excused)'}
                                                            </span>
                                                          </td>
                                                          <td className="p-3 text-center">
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mx-auto shadow-3xs ${
                                                              h.status === 'present' ? 'bg-emerald-500 text-white' :
                                                              h.status === 'absent' ? 'bg-rose-500 text-white' :
                                                              'bg-amber-500 text-white'
                                                            }`}>
                                                              {h.status === 'present' ? '✔' :
                                                               h.status === 'absent' ? '✘' :
                                                               '📝'}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : (
                                              <div className="text-center py-10 bg-stone-50 dark:bg-stone-950/10 border border-stone-150 dark:border-stone-850 rounded-xl">
                                                <CalendarDays className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                                                <p className="text-stone-500 dark:text-stone-400 text-xs font-semibold mt-2">
                                                  እስካሁን ምንም የእለታዊ አቴንዳንስ መረጃ አልተመዘገበም (No daily attendance entries yet)
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center p-8 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2">
                                  <span className="text-3xl block">🔍❌</span>
                                  <h4 className="font-extrabold text-rose-950 text-sm">ተማሪው አልተገኘም (Student Not Found)</h4>
                                  <p className="text-stone-500 text-xs leading-relaxed max-w-sm mx-auto">
                                    ያስገቡት መታወቂያ በሲስተሙ ውስጥ አልተመዘገበም። እባክዎን የመታወቂያ ቁጥሩን አስተካክለው በድጋሚ ይሞክሩ።
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-12 h-full text-stone-400 space-y-2">
                              <BookOpen className="w-12 h-12 text-stone-200" />
                              <p className="text-sm font-semibold">ውጤት ለማየት የተማሪውን መታወቂያ ያስገቡ</p>
                              <p className="text-xs">Select or enter a valid Student ID in the left form</p>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  )}

                  {/* 4. STUDENT REPORT CARD WORKSPACE */}
                  {currentUser?.role === 'student' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in" id="student-workspace">
                      
                      {/* Left Column: Profile & QR ID Card */}
                      <div className="lg:col-span-4 bg-white border border-stone-200 p-6 rounded-2xl space-y-6 shadow-xs">
                        <div className="text-center pb-4 border-b border-stone-100">
                          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner border border-indigo-100 mb-3">
                            {foundStudent ? foundStudent.name.substring(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 leading-tight">
                            {foundStudent?.name}
                          </h3>
                          <span className="inline-block mt-1 px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                            ተማሪ (Student)
                          </span>
                        </div>

                        {/* Student Details Info */}
                        <div className="space-y-3.5 text-xs text-stone-700">
                          <div className="flex justify-between items-center py-2 border-b border-stone-100/50">
                            <span className="text-stone-400 font-medium">መታወቂያ ቁጥር (ID):</span>
                            <span className="font-mono font-black text-indigo-700">{foundStudent?.id}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-stone-100/50">
                            <span className="text-stone-400 font-medium">ክፍል (Grade):</span>
                            <span className="font-black text-stone-900">{foundStudent?.grade} {foundStudent?.section}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-stone-100/50">
                            <span className="text-stone-400 font-medium">የወላጅ ኢሜል (Parent):</span>
                            <span className="font-semibold text-stone-900">{foundStudent?.parentEmail || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Personalized Student QR Code Card Section */}
                        <div className="bg-indigo-50/50 border border-indigo-100/60 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                          <div className="flex items-center gap-2 justify-center border-b border-indigo-100/40 w-full pb-2.5">
                            <QrCode className="w-5 h-5 text-indigo-600 shrink-0" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">የQR መግቢያ ካርድ (QR ID Card)</span>
                          </div>
                          
                          {foundStudent && (
                            <div className="bg-white p-3 rounded-2xl shadow-xs border border-indigo-100">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${foundStudent.id}`} 
                                alt={`QR code for student ${foundStudent.id}`}
                                className="w-36 h-36"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <p className="text-[10px] text-stone-500 leading-relaxed max-w-[200px]">
                            ይህንን የQR ኮድ በመጠቀም በስልክዎ በቀላሉ መግባት ወይም የእለት አቴንዳንስ መመዝገብ ይችላሉ።
                          </p>

                          <button
                            onClick={() => {
                              playInteractiveSound('click');
                              window.print();
                            }}
                            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            title="QR ካርድ አትም"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            አትም (Print ID Card)
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Portal tabs (Grades, Notices, Attendance) */}
                      <div className="lg:col-span-8 bg-white border border-stone-200 p-6 rounded-2xl shadow-xs space-y-6">
                        {/* Tab Sub-Navigation */}
                        <div className="flex border-b border-stone-100 gap-1 pb-px">
                          <button 
                            onClick={() => { playInteractiveSound('click'); setParentSubView('grades'); }}
                            className={`px-4 py-3 font-extrabold text-xs tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                              parentSubView === 'grades'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            📊 ውጤት መመልከቻ (Report Card)
                          </button>
                          
                          <button 
                            onClick={() => { playInteractiveSound('click'); setParentSubView('notices'); }}
                            className={`px-4 py-3 font-extrabold text-xs tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                              parentSubView === 'notices'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            📢 ማስታወቂያዎች (Notices)
                          </button>
                          
                          <button 
                            onClick={() => { playInteractiveSound('click'); setParentSubView('attendance'); }}
                            className={`px-4 py-3 font-extrabold text-xs tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                              parentSubView === 'attendance'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            📅 አቴንዳንስና ምግባር (Attendance)
                          </button>
                        </div>

                        {/* Rendering content based on selected tab */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={parentSubView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            {parentSubView === 'grades' && (
                              <div className="space-y-6">
                                <div className="flex justify-between items-center flex-wrap gap-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                                  <div>
                                    <h4 className="font-bold text-stone-800 text-sm">የተማሪው የውጤት ሪፖርት (Student Report Card Sheet)</h4>
                                    <p className="text-[11px] text-stone-400">Authenticated and verified by Principal</p>
                                  </div>
                                  <button
                                    onClick={() => { playInteractiveSound('success'); setShowPrintModal(true); }}
                                    className="px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/50 text-indigo-800 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> ማተሚያ ፎርማት (Print Report Card)
                                  </button>
                                </div>

                                {/* Standard Report Table */}
                                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-stone-200">
                                        <th className="p-3">የትምህርት አይነት (Subject)</th>
                                        <th className="p-3 text-center">ኩዊዝ ({wlQuizMax}%)</th>
                                        <th className="p-3 text-center">ክፍል ስራ ({wlCwMax}%)</th>
                                        <th className="p-3 text-center">የቤት ስራ ({wlHwMax}%)</th>
                                        <th className="p-3 text-center">ግማሽ ፈተና ({wlMidMax}%)</th>
                                        <th className="p-3 text-center">ማጠቃለያ ፈተና ({wlFinalMax}%)</th>
                                        <th className="p-3 text-center">ጠቅላላ (Total)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {foundGrades.length > 0 ? (
                                        foundGrades.map((g) => {
                                          const finalScore = g.quiz + g.cw + g.hw + g.mid + g.final;
                                          return (
                                            <tr key={g.id} className="hover:bg-stone-50/50 border-b border-stone-150 text-stone-800">
                                              <td className="p-3 font-bold text-stone-900">{g.subject}</td>
                                              <td className="p-3 text-center">{g.quiz}</td>
                                              <td className="p-3 text-center">{g.cw}</td>
                                              <td className="p-3 text-center">{g.hw}</td>
                                              <td className="p-3 text-center">{g.mid}</td>
                                              <td className="p-3 text-center">{g.final}</td>
                                              <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-md font-bold ${
                                                  finalScore >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                                  finalScore >= 60 ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                                                  'bg-rose-50 text-rose-800 border border-rose-100'
                                                }`}>
                                                  {finalScore}%
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr>
                                          <td colSpan={7} className="p-8 text-center text-stone-400 italic font-semibold">
                                            እስካሁን ምንም የውጤት መረጃ አልተመዘገበም (No grades entered yet)
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {parentSubView === 'notices' && (
                              <div className="space-y-4">
                                <h4 className="font-extrabold text-stone-800 text-sm">የትምህርት ቤት የቅርብ ጊዜ ማስታወቂያዎች (School Announcements)</h4>
                                <div className="space-y-3">
                                  {announcements.map((ann) => (
                                    <div key={ann.id} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                                      <div className="flex justify-between items-start gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md">
                                          📣 {ann.category}
                                        </span>
                                        <span className="text-[10px] text-stone-400 font-mono font-bold">
                                          {ann.date}
                                        </span>
                                      </div>
                                      <h5 className="font-bold text-stone-900 text-sm">{ann.title}</h5>
                                      <p className="text-stone-600 text-xs leading-relaxed">{ann.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {parentSubView === 'attendance' && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Attendance Summary Card */}
                                  <div className="bg-amber-500 text-white p-5 rounded-2xl flex items-center justify-between shadow-xs">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">የመቅረት ሁኔታ (Attendance)</span>
                                      <p className="text-2xl font-black">{studentExtraInfo[foundStudent?.id || '']?.absent ?? 0} ቀናት ቀርተዋል</p>
                                      <span className="text-[10px] bg-amber-600 px-2 py-0.5 rounded-full font-bold inline-block">
                                        {(studentExtraInfo[foundStudent?.id || '']?.absent ?? 0) === 0 ? '💯 ሙሉ መገኘት (Perfect)' : 'ቀሪ ቀናት ተመዝግቧል'}
                                      </span>
                                    </div>
                                    <CalendarDays className="w-12 h-12 text-amber-200/40 shrink-0" />
                                  </div>

                                  {/* Conduct Score Card */}
                                  <div className="bg-indigo-600 text-white p-5 rounded-2xl flex items-center justify-between shadow-xs">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 block">የምግባር ደረጃ (Conduct Grade)</span>
                                      <p className="text-2xl font-black">ውጤት: {studentExtraInfo[foundStudent?.id || '']?.conduct ?? 'A'}</p>
                                      <span className="text-[10px] bg-indigo-700 px-2 py-0.5 rounded-full font-bold inline-block">
                                        በክፍል አላፊው የተሰጠ ምዘና (Homeroom Teacher Assessment)
                                      </span>
                                    </div>
                                    <Award className="w-12 h-12 text-indigo-200/40 shrink-0" />
                                  </div>
                                </div>

                                {/* Daily Attendance History */}
                                <div className="bg-white border border-stone-200 p-5 rounded-2xl space-y-4 shadow-xs">
                                  <h4 className="font-extrabold text-stone-800 text-sm">🗓️ ዝርዝር የእለታዊ አቴንዳንስ መዝገብ (Daily Attendance History Log)</h4>
                                  {(() => {
                                    if (!foundStudent) return null;
                                    const historyList = [];
                                    try {
                                      const saved = JSON.parse(localStorage.getItem('dailyAttendance') || '{}');
                                      Object.keys(saved).forEach((dateStr) => {
                                        const dayRecord = saved[dateStr];
                                        if (dayRecord && dayRecord[foundStudent.id]) {
                                          historyList.push({ date: dateStr, status: dayRecord[foundStudent.id] });
                                        }
                                      });
                                    } catch (e) {}

                                    historyList.sort((a, b) => b.date.localeCompare(a.date));

                                    return historyList.length > 0 ? (
                                      <div className="space-y-2">
                                        {historyList.map((h, idx) => (
                                          <div key={idx} className="flex justify-between items-center p-3 border border-stone-100 rounded-xl bg-stone-50/50">
                                            <span className="font-mono text-stone-700 font-bold">{h.date}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                              h.status === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                              h.status === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                                              'bg-amber-50 text-amber-800 border border-amber-100'
                                            }`}>
                                              {h.status === 'present' ? '✓ መጥቷል (Present)' : h.status === 'absent' ? '✗ የቀረ (Absent)' : '🕒 ፍቃድ (Excused)'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-stone-400 italic">እስካሁን የተመዘገበ የእለት አቴንዳንስ መዝገብ የለም። (No daily attendance records found.)</p>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </motion.div>
          )}

          {/* TAB 1.5: THE SAAS WHITE-LABEL SETUP CONFIGURATOR */}
          {activeTab === 'whitelabel' && (
            <motion.div
              key="whitelabel-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 max-w-4xl mx-auto print:hidden"
            >
              <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-2xl font-black text-slate-900">🏪 ነጭ-መለያ የገበያ ማስተካከያ (SaaS Configurator)</h2>
                  </div>
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                    ይህ ሲስተም ለተለያዩ ትምህርት ቤቶች ተሸጦ መተግበር እንዲችል ሙሉ በሙሉ ተለዋዋጭ (white-label) ሆኖ የተገነባ ነው። እዚህ ላይ የሚቀይሩት ማንኛውም የትምህርት ቤት ስም፣ መሪ ቃል፣ አርማ፣ ቀለማት እና የትምህርት አይነቶች በፖርታሉ፣ በምዝገባ ፎርሞች፣ በማርክ ሊስት እና በሮስተር ማተሚያ ላይ ወዲያውኑ ይንጸባረቃሉ!
                  </p>
                </div>

                {/* DYNAMIC MULTI-SCHOOL WORKSPACE SWITCHER */}
                <div className="bg-stone-50 dark:bg-stone-900/30 border border-stone-200/80 p-5 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        🌐 የትምህርት ቤት ወርክስፔስ መቆጣጠሪያ (Multi-School Workspace Controller)
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                          Multi-Tenant Active
                        </span>
                      </h3>
                      <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
                        ይህ ሲስተም ባለብዙ-ተከራይ (Multi-Tenant) አርክቴክቸርን በመጠቀም የትምህርት ቤቶችን ዳታ ሙሉ በሙሉ ይለያል። እያንዳንዱ ትምህርት ቤት የየራሱ የሆነ ወርክስፔስ ኮድ አለው። በዚህም ምክንያት የአንዱ ትምህርት ቤት መረጃ (ተማሪዎች፣ ውጤቶች፣ አስተማሪዎችና አወቃቀሮች) ከሌላው ጋር በጭራሽ አይቀላቀልም!
                      </p>
                      <p className="text-stone-400 text-[11px] leading-relaxed italic">
                        (This system utilizes a Multi-Tenant architecture to isolate database collections for each school. All records for students, grades, and configs are partitioned dynamically under unique Workspace Codes, preventing any data mixing.)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-3 shadow-3xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block mb-1">
                          የአሁኑ ንቁ ወርክስፔስ (Active Workspace)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-stone-800 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                            {schoolWorkspaceId}
                          </span>
                          <span className="text-xs text-stone-400 font-semibold">
                            {schoolConfig.nameAmh || 'ክብር መካከለኛ ደረጃ ትምህርት ቤት'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                          ለዚህ ትምህርት ቤት የሚጋራው ቀጥተኛ ሊንክ (Shareable School URL)
                        </span>
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/60 p-2 rounded-lg">
                          <span className="text-[10px] font-mono text-stone-500 select-all truncate flex-1">
                            {`${window.location.origin}${window.location.pathname}?school=${schoolWorkspaceId}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}${window.location.pathname}?school=${schoolWorkspaceId}`;
                              navigator.clipboard.writeText(shareUrl);
                              setCopiedId('workspace_link');
                              playInteractiveSound('click');
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="p-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
                            title="Copy share link"
                          >
                            {copiedId === 'workspace_link' ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-stone-400 leading-normal">
                          ይህንን ሊንክ ለሌሎች ትምህርት ቤቶች በማጋራት፣ የየራሳቸውን ወርክስፔስ ኮድ አስገብተው ሙሉ በሙሉ ገለልተኛ በሆነ መንገድ እንዲጠቀሙ ማድረግ ይችላሉ።
                        </p>

                        {/* URL Shortener Feature Panel */}
                        <div className="mt-3.5 pt-3.5 border-t border-stone-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                              🔗 አጭር ሊንክ ማመንጫ (Short Link Generator)
                            </span>
                          </div>
                          
                          {shortenedWorkspaceUrl ? (
                            <div className="space-y-1.5 animate-fadeIn">
                              <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-200 p-2 rounded-lg">
                                <span className="text-[11px] font-mono font-bold text-emerald-800 select-all truncate flex-1">
                                  {shortenedWorkspaceUrl}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(shortenedWorkspaceUrl);
                                    setCopiedId('shortened_link');
                                    playInteractiveSound('click');
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="p-1.5 bg-white hover:bg-emerald-100/50 border border-emerald-200 rounded-md text-emerald-700 transition-all cursor-pointer"
                                  title="Copy short link"
                                >
                                  {copiedId === 'shortened_link' ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-emerald-600 font-bold">✓ አጭር ሊንክ በተሳካ ሁኔታ ተፈጥሯል! (Short link generated!)</span>
                                <button 
                                  onClick={() => setShortenedWorkspaceUrl('')}
                                  className="text-stone-400 hover:text-stone-600 underline cursor-pointer"
                                >
                                  አዲስ ፍጠር (Clear)
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={handleGenerateShortLink}
                                disabled={isShortening}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              >
                                {isShortening ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                    በማመንጨት ላይ... (Generating...)
                                  </>
                                ) : (
                                  <>
                                    ⚡ አጭር ሊንክ ፍጠር (Generate Short Link)
                                  </>
                                )}
                              </button>
                              {shortenError && (
                                <p className="text-[9px] text-rose-500 font-bold text-center mt-1">⚠️ {shortenError}</p>
                              )}
                              <p className="text-[9px] text-stone-400 leading-normal text-center">
                                ረጅሙን የሲስተሙን ሊንክ ወደ አጭር እና ለማጋራት ቀላል ወደሆነ ሊንክ ይቀይራል። (Converts the long system URL to a short shareable link).
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-3 shadow-3xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">
                          አዲስ ወርክስፔስ መፍጠር / መቀየር (Create or Switch Workspace)
                        </label>
                        <input
                          type="text"
                          value={tempWorkspaceId}
                          onChange={(e) => setTempWorkspaceId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          placeholder="උදා፦ bole, menelik, shola"
                          className="w-full p-2.5 rounded-lg border border-stone-200 text-xs focus:border-indigo-500 outline-none font-mono"
                        />
                        <p className="text-[9px] text-stone-400 leading-normal">
                          ፊደላት፣ ቁጥሮች እና ሰረዝ (-) ብቻ መጠቀም ይችላሉ። ትንንሽ ፊደላት ብቻ ይፈቀዳሉ። (Lowercase alphanumeric letters and dashes only.)
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!tempWorkspaceId.trim()) return;
                            playInteractiveSound('click');
                            const target = tempWorkspaceId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                            
                            // Switch workspace state
                            setSchoolWorkspaceId(target);
                            localStorage.setItem('school_workspace_id', target);
                            
                            // Push to URL query params smoothly
                            const newUrl = `${window.location.origin}${window.location.pathname}?school=${target}`;
                            window.history.pushState({ path: newUrl }, '', newUrl);

                            setWorkspaceSuccessMsg(`ወደ "${target}" ወርክስፔስ በተሳካ ሁኔታ ተቀይሯል! የትምህርት ቤቱ መረጃ በመጫን ላይ ነው...`);
                            setTimeout(() => setWorkspaceSuccessMsg(null), 5000);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all shadow-3xs flex items-center justify-center gap-1.5"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>ወደዚህ ወርክስፔስ ቀይር / ፍጠር</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {workspaceSuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-indigo-50 text-indigo-900 border border-indigo-100 text-[11px] font-bold rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>{workspaceSuccessMsg}</span>
                    </motion.div>
                  )}
                </div>

                {wlSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs md:text-sm font-bold rounded-2xl flex items-center gap-2"
                  >
                    <span>🎉</span>
                    <span>ብራንዲንግ በተሳካ ሁኔታ ተቀይሯል! ሙሉ ሲስተሙ አሁን የእርስዎን ትምህርት ቤት ያንጸባርቃል። (Branding updated successfully!)</span>
                  </motion.div>
                )}

                <form onSubmit={handleSaveWhiteLabel} className="space-y-6">
                  
                  {/* Basic Branding Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🏫 የተቋሙ ስም - በአማርኛ (School Name - Amharic):</label>
                      <input 
                        type="text"
                        value={wlNameAmh}
                        onChange={(e) => setWlNameAmh(e.target.value)}
                        placeholder="ክብር መካከለኛ ደረጃ ትምህርት ቤት"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 outline-none bg-stone-50/50 font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🏫 የተቋሙ ስም - በእንግሊዝኛ (School Name - English):</label>
                      <input 
                        type="text"
                        value={wlNameEng}
                        onChange={(e) => setWlNameEng(e.target.value)}
                        placeholder="Kibr Middle School"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 outline-none bg-stone-50/50 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🏆 መሪ ቃል - በአማርኛ (Motto - Amharic):</label>
                      <input 
                        type="text"
                        value={wlMottoAmh}
                        onChange={(e) => setWlMottoAmh(e.target.value)}
                        placeholder="ለክህሎትና ለውጤታማነት እንተጋለን!"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 outline-none bg-stone-50/50 font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🏆 መሪ ቃል - በእንግሊዝኛ (Motto - English):</label>
                      <input 
                        type="text"
                        value={wlMottoEng}
                        onChange={(e) => setWlMottoEng(e.target.value)}
                        placeholder="Striving for Skills and Success!"
                        className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-emerald-600 outline-none bg-stone-50/50 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* System UI Look & Feel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-2">🎨 የሲስተሙ ዋና ቀለም (Theme Color Accent):</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(THEMES).map((themeName) => {
                          const t = THEMES[themeName as keyof typeof THEMES];
                          const bgColors: Record<string, string> = {
                            indigo: 'bg-indigo-600',
                            emerald: 'bg-emerald-600',
                            violet: 'bg-violet-600',
                            rose: 'bg-rose-600',
                            amber: 'bg-amber-600',
                            slate: 'bg-slate-600'
                          };
                          return (
                            <button
                              type="button"
                              key={themeName}
                              onClick={() => { playInteractiveSound('click'); setWlThemeColor(themeName as any); }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border flex items-center gap-1.5 ${
                                wlThemeColor === themeName 
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              <span className={`w-3 h-3 rounded-full inline-block ${bgColors[themeName] || 'bg-indigo-600'}`} />
                              <span>{themeName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-2">🛡️ የትምህርት ቤት አርማ (School Logo / Icon):</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'graduation', label: 'Graduation Cap', icon: <GraduationCap className="w-4 h-4" /> },
                          { id: 'book', label: 'Open Book', icon: <BookOpen className="w-4 h-4" /> },
                          { id: 'shield', label: 'Academic Shield', icon: <ShieldCheck className="w-4 h-4" /> },
                          { id: 'award', label: 'Honors Award', icon: <Award className="w-4 h-4" /> }
                        ].map((logo) => (
                          <button
                            type="button"
                            key={logo.id}
                            onClick={() => { playInteractiveSound('click'); setWlLogoType(logo.id as any); }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                              wlLogoType === logo.id 
                                ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {logo.icon}
                            <span>{logo.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Period Mode Settings */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">📅 የውጤት መገምገሚያ የጊዜ ዑደት (Evaluation Period Mode):</label>
                      <p className="text-stone-400 text-[11px]">
                        ትምህርት ቤቱ ውጤትን በሩብ ዓመት (Quarter) ወይስ በሴሚስተር (Semester) ብቻ እንደሚያሰላ እዚህ ይምረጡ። (Select whether results are evaluated by quarters or by semesters)
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => { playInteractiveSound('click'); setWlEvaluationMode('quarter'); }}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                          wlEvaluationMode === 'quarter'
                            ? 'bg-indigo-50/80 text-indigo-950 border-indigo-300 ring-2 ring-indigo-100 shadow-sm'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="text-2xl">🕒</span>
                        <div>
                          <strong className="text-xs block">ሩብ ዓመት (Quarter Mode)</strong>
                          <span className="text-[10px] text-stone-400 block mt-0.5">4 Quarters (Q1, Q2, Q3, Q4) with annual average</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { playInteractiveSound('click'); setWlEvaluationMode('semester'); }}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                          wlEvaluationMode === 'semester'
                            ? 'bg-indigo-50/80 text-indigo-950 border-indigo-300 ring-2 ring-indigo-100 shadow-sm'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="text-2xl">📅</span>
                        <div>
                          <strong className="text-xs block font-bold">ሴሚስተር (Semester Mode)</strong>
                          <span className="text-[10px] text-stone-400 block mt-0.5">2 Semesters (Sem 1, Sem 2) with annual average</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* School Level Settings */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🏫 የትምህርት ቤት የክፍል ደረጃ (School Level / Grade Range):</label>
                      <p className="text-stone-400 text-[11px]">
                        የትምህርት ቤቱን ደረጃ እዚህ ይምረጡ። አንደኛ ደረጃ (ከ1-8ኛ ክፍል) ወይም ሁለተኛ ደረጃ/መሰናዶ (ከ9-12ኛ ክፍል)። ይህ ሲመረጥ መላው ሲስተም ተዛማጅ ክፍሎችን ብቻ ያሳያል። (Select grade range: 1-8 or 9-12)
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => { playInteractiveSound('click'); setWlSchoolLevel('primary'); }}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                          wlSchoolLevel === 'primary'
                            ? 'bg-indigo-50/80 text-indigo-950 border-indigo-300 ring-2 ring-indigo-100 shadow-sm'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="text-2xl">🎒</span>
                        <div>
                          <strong className="text-xs block font-bold">አንደኛ ደረጃ ትምህርት ቤት (Grade 1-8)</strong>
                          <span className="text-[10px] text-stone-400 block mt-0.5">Primary School with Grade 1 to 8 dynamic filtering</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { playInteractiveSound('click'); setWlSchoolLevel('secondary'); }}
                        className={`flex-1 p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                          wlSchoolLevel === 'secondary'
                            ? 'bg-indigo-50/80 text-indigo-950 border-indigo-300 ring-2 ring-indigo-100 shadow-sm'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="text-2xl">🎓</span>
                        <div>
                          <strong className="text-xs block font-bold">ሁለተኛ ደረጃ እና መሰናዶ (Grade 9-12)</strong>
                          <span className="text-[10px] text-stone-400 block mt-0.5">Secondary & Preparatory with Grade 9 to 12 dynamic filtering</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Subjects Manager */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">📚 የትምህርት አይነቶች ዝርዝር (SaaS Dynamic Curriculum):</label>
                      <p className="text-stone-400 text-[11px]">
                        ተማሪዎች የሚማሩትንና ውጤት የሚመዘገብባቸውን የትምህርት አይነቶች እዚህ ያስተዳድሩ። (Subjects can be added or removed below)
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1.5 bg-white border border-stone-200 rounded-xl">
                      {wlSubjects.map((sub, index) => (
                        <div 
                          key={index} 
                          className="bg-stone-100 hover:bg-rose-50 text-stone-800 hover:text-rose-900 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 flex items-center gap-2 transition-all group"
                        >
                          <span>📚 {sub}</span>
                          <button
                            type="button"
                            onClick={() => {
                              playInteractiveSound('wrong');
                              setWlSubjects(prev => prev.filter(s => s !== sub));
                            }}
                            className="text-stone-400 hover:text-rose-600 focus:outline-none transition-all"
                            title="Remove Subject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {wlSubjects.length === 0 && (
                        <span className="text-xs text-stone-400 italic p-2">ምንም ትምህርት አይነት አልተጨመረም! (No subjects defined yet)</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={wlNewSubject}
                        onChange={(e) => setWlNewSubject(e.target.value)}
                        placeholder="አዲስ የትምህርት አይነት (e.g. History, Geography, ICT)"
                        className="flex-1 p-2.5 rounded-xl border border-stone-200 text-xs focus:border-emerald-600 outline-none bg-white font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = wlNewSubject.trim();
                          if (val) {
                            const isDup = wlSubjects.some(sub => sub.toLowerCase().trim() === val.toLowerCase());
                            if (isDup) {
                              playInteractiveSound('wrong');
                              alert(`⚠️ የትምህርት አይነት "${val}" ቀደም ሲል ተመዝግቧል! (Subject "${val}" is already registered!)`);
                            } else {
                              playInteractiveSound('success');
                              setWlSubjects(prev => [...prev, val]);
                              setWlNewSubject('');
                            }
                          } else {
                            playInteractiveSound('wrong');
                          }
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
                      >
                        ➕ ጨምር (Add)
                      </button>
                    </div>
                  </div>

                  {/* SaaS Dynamic Assessment Configurator */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">🎛️ የማርክ አሰጣጥ ምዘና ክፍሎች (Assessment Components Configurator):</label>
                      <p className="text-stone-400 text-[11px] leading-relaxed">
                        የማርክ ዝርዝር እንደየ ትምህርት አይነቶቹ ሊለያይ ይችላል። እዚህ ላይ ለአንድ የተወሰነ የትምህርት አይነት ወይም ለሁሉም እንደ አጠቃላይ መደበኛ (Default) የምዘና ክፍሎችን ማስተካከል ይችላሉ። <strong>ጠቅላላ የምዘናዎቹ ድምር 100% መሆን አለበት።</strong> ማንኛውንም ክፍል ለመደበቅ ከፍተኛ ነጥቡን <strong>0</strong> ያድርጉት።
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-white p-3.5 rounded-xl border border-stone-200">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-stone-400 mb-1">🎯 የትምህርት አይነት ይምረጡ (Select Subject):</label>
                        <select
                          value={wlSelectedSubjectAssessment}
                          onChange={(e) => {
                            playInteractiveSound('click');
                            setWlSelectedSubjectAssessment(e.target.value);
                          }}
                          className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-indigo-600 outline-none bg-stone-50 font-bold"
                        >
                          <option value="default">🌟 መደበኛ አጠቃላይ (Default Template)</option>
                          {wlSubjects.map((sub, idx) => (
                            <option key={idx} value={sub}>📚 {sub}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 flex flex-col justify-end text-right md:pr-2">
                        <span className="text-[10px] uppercase text-stone-400 font-extrabold">የአሁኑ አጠቃላይ ድምር (Current Sum of Weights)</span>
                        <div className="flex justify-end items-center gap-2 mt-1">
                          <span className={`text-lg font-black ${wlQuizMax + wlCwMax + wlHwMax + wlMidMax + wlFinalMax === 100 ? 'text-emerald-600' : 'text-rose-600 font-extrabold ring-1 ring-rose-100 px-2 py-0.5 rounded-md bg-rose-50'}`}>
                            {wlQuizMax + wlCwMax + wlHwMax + wlMidMax + wlFinalMax} / 100
                          </span>
                          {wlQuizMax + wlCwMax + wlHwMax + wlMidMax + wlFinalMax === 100 ? (
                            <span className="text-xs text-emerald-600 font-bold">✔️ ዝግጁ ነው! (Valid)</span>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-bold">⚠️ ድምሩ 100 መሆን አለበት!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
                      {/* Quiz Component */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1">
                        <span className="text-[10px] font-black text-stone-500 block">📝 Quiz (ኩዊዝ)</span>
                        <input
                          type="number"
                          value={wlQuizMax}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setWlQuizMax(val);
                          }}
                          className="w-full p-2 rounded-lg border border-stone-200 text-xs font-black text-center focus:border-indigo-600 outline-none bg-stone-50"
                        />
                        <span className="text-[9px] text-stone-400 block text-center font-bold">Max: {wlQuizMax}</span>
                      </div>

                      {/* Classwork Component */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1">
                        <span className="text-[10px] font-black text-stone-500 block">🏫 Classwork</span>
                        <input
                          type="number"
                          value={wlCwMax}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setWlCwMax(val);
                          }}
                          className="w-full p-2 rounded-lg border border-stone-200 text-xs font-black text-center focus:border-indigo-600 outline-none bg-stone-50"
                        />
                        <span className="text-[9px] text-stone-400 block text-center font-bold">Max: {wlCwMax}</span>
                      </div>

                      {/* Homework Component */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1">
                        <span className="text-[10px] font-black text-stone-500 block">🏠 Homework</span>
                        <input
                          type="number"
                          value={wlHwMax}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setWlHwMax(val);
                          }}
                          className="w-full p-2 rounded-lg border border-stone-200 text-xs font-black text-center focus:border-indigo-600 outline-none bg-stone-50"
                        />
                        <span className="text-[9px] text-stone-400 block text-center font-bold">Max: {wlHwMax}</span>
                      </div>

                      {/* Midterm Component */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1">
                        <span className="text-[10px] font-black text-stone-500 block">🌗 Mid Exam</span>
                        <input
                          type="number"
                          value={wlMidMax}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setWlMidMax(val);
                          }}
                          className="w-full p-2 rounded-lg border border-stone-200 text-xs font-black text-center focus:border-indigo-600 outline-none bg-stone-50"
                        />
                        <span className="text-[9px] text-stone-400 block text-center font-bold">Max: {wlMidMax}</span>
                      </div>

                      {/* Final Component */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-black text-stone-500 block">🏁 Final Exam</span>
                        <input
                          type="number"
                          value={wlFinalMax}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setWlFinalMax(val);
                          }}
                          className="w-full p-2 rounded-lg border border-stone-200 text-xs font-black text-center focus:border-indigo-600 outline-none bg-stone-50"
                        />
                        <span className="text-[9px] text-stone-400 block text-center font-bold">Max: {wlFinalMax}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">📞 ስልክ ቁጥር (Phone):</label>
                      <input 
                        type="text"
                        value={wlPhone}
                        onChange={(e) => setWlPhone(e.target.value)}
                        placeholder="0111223344"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-emerald-600 outline-none bg-stone-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">📧 የኢሜል አድራሻ (Email):</label>
                      <input 
                        type="email"
                        value={wlEmail}
                        onChange={(e) => setWlEmail(e.target.value)}
                        placeholder="info@kibrschool.edu.et"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-emerald-600 outline-none bg-stone-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-500 mb-1">📍 አድራሻ (Address):</label>
                      <input 
                        type="text"
                        value={wlAddress}
                        onChange={(e) => setWlAddress(e.target.value)}
                        placeholder="አዲስ አበባ፣ ኢትዮጵያ"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-emerald-600 outline-none bg-stone-50/50"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
                  >
                    <span>💾</span>
                    <span>የትምህርት ቤቱን መረጃዎች መዝግብ (Apply School Branding)</span>
                  </button>

                </form>
              </div>

              {/* DATABASE BACKUP AND RESTORE UTILITY */}
              <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xl font-black text-slate-900">🗄️ የዳታ ምትኬና መመለሻ ማስተዳደሪያ (Backup & Restore Utility)</h3>
                  </div>
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                    ይህ ሲስተም ለገበያ ሲቀርብ ያለ ምንም የመረጃ መጥፋት ስጋት በነጻነት መስራት እንዲችል የሀገር ውስጥ ትምህርት ቤቶችን ፍላጎት መሰረት ባደረገ መልኩ <strong>ከኢንተርኔት ነጻ (Offline-First)</strong> ሆኖ የተገነባ ነው። ሁሉም መረጃዎች በብሮውዘርዎ ላይ በቋሚነት ይቀመጣሉ። ለተጨማሪ ጥንቃቄ የሲስተሙን መላ መረጃ (ተማሪዎች፣ አስተማሪዎች፣ ውጤቶች እና ብራንዲንግ) ወደ ኮምፒውተርዎ በፋይል መልክ መቅዳት (Backup ማውረድ) ወይም ቀደም ሲል ያወረዱትን ምትኬ መልሰው መጫን (Restore ማድረግ) ይችላሉ።
                  </p>
                </div>

                {restoreSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs md:text-sm font-bold rounded-2xl flex items-center gap-2 shadow-sm"
                  >
                    <span className="text-lg">✔️</span>
                    <span>{restoreSuccess}</span>
                  </motion.div>
                )}

                {restoreError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 text-rose-900 border border-rose-200 text-xs md:text-sm font-bold rounded-2xl flex items-center gap-2 shadow-sm"
                  >
                    <span className="text-lg">⚠️</span>
                    <span>{restoreError}</span>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Export Card */}
                  <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/60 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-1">DOWNLOAD ARCHIVE</span>
                      <h4 className="text-sm font-extrabold text-stone-800">1. የሲስተሙን ዳታ ምትኬ አውርድ (Backup Data)</h4>
                      <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                        የአሁኑን የትምህርት ቤት መረጃዎች በሙሉ በአንድ ደህንነቱ የተጠበቀ የኮምፒውተር ፋይል (.json) አድርገው ማውረድ። ይህንን ፋይል ለወደፊቱ ዳታ ለመመለስ መጠቀም ይችላሉ።
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>ምትኬ ፋይል አውርድ (Download Backup File)</span>
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/60 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block mb-1">RESTORE FROM FILE</span>
                      <h4 className="text-sm font-extrabold text-stone-800">2. ምትኬ ፋይል ወደ ሲስተሙ መልስ (Restore Data)</h4>
                      <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                        ቀደም ሲል ያስቀመጡትን የትምህርት ቤት የዳታ ምትኬ ፋይል (.json) እዚህ በመጫን መላውን ሲስተም ወደነበረበት ይመልሱ።
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        id="backup-upload-input"
                        className="hidden"
                      />
                      <label
                        htmlFor="backup-upload-input"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer text-center"
                      >
                        <Upload className="w-4 h-4" />
                        <span>ምትኬ ፋይል ምረጥና ጫን (Upload & Restore Backup)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-900 leading-relaxed font-semibold flex items-start gap-2">
                  <span>💡</span>
                  <p>
                    <strong>የደህንነት ማስጠንቀቂያ፡</strong> አዲስ የምትኬ ፋይል ሲጭኑ በአሁኑ ሰዓት በብሮውዘርዎ ላይ የተመዘገቡት የድሮ መረጃዎች በሙሉ በአዲሱ ፋይል ይተካሉ! ከመተካትዎ በፊት የአሁኑን ዳታ ምትኬ አውርደው ማስቀመጥዎን ያረጋግጡ።
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: DEFECTS ANALYSIS REPORT (SECURITY AUDIT) */}
          {activeTab === 'report' && (
            <motion.div
              key="report-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 print:hidden"
            >
              
              <div className="bg-white border border-stone-200 p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 w-6 h-6" /> በዋናው ኮድ ላይ የተገኙ 4 የስራና የደህንነት ክፍተቶች (Defects Report)
                </h2>
                <p className="text-stone-500 text-xs md:text-sm mt-1 leading-relaxed">
                  በተጠቃሚው ኮድ ውስጥ የተገኙትን ዋና ዋና ክፍተቶች እና ለምን ጎጂ እንደሆኑ በዝርዝር መርምረናል። በፕሮቶታይፑ ላይ ያደረግናቸውን ማሻሻያዎች ከዚህ በታች ያንብቡ።
                </p>
              </div>

              {/* Grid of Defects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFECTS_REPORT.map((defect) => (
                  <div 
                    key={defect.id}
                    onClick={() => { playInteractiveSound('click'); setSelectedDefect(defect); }}
                    className="p-5 bg-white border border-stone-200 rounded-2xl hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative"
                    id={`defect-card-${defect.id}`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md ${
                          defect.severity === 'Critical' 
                            ? 'bg-rose-50 text-rose-800 border border-rose-100' 
                            : 'bg-amber-50 text-amber-800 border border-amber-100'
                        }`}>
                          {defect.severity} Severity
                        </span>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-all" />
                      </div>

                      <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-amber-700 transition-colors">
                        {defect.titleAmh}
                      </h3>
                      <p className="text-xs text-stone-400 italic font-mono mt-0.5">{defect.titleEng}</p>
                      <p className="text-xs text-stone-600 mt-2.5 leading-relaxed line-clamp-3">
                        {defect.descriptionAmh}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                      <span>👀 የኮድ ማነጻጸሪያን ተመልከት (View Code Fix)</span>
                      <span className="font-mono text-[10px] opacity-60">ID: {defect.id}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Print modal has been relocated globally to support all tabs */}

              {/* Detailed overlay modal for a selected defect with Buggy vs Fixed Code */}
              <AnimatePresence>
                {selectedDefect && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="defect-modal">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedDefect(null)}
                      className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm"
                    />

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative bg-white border border-stone-200 w-full max-w-3xl p-6 md:p-8 rounded-3xl shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
                    >
                      <button 
                        onClick={() => setSelectedDefect(null)}
                        className="p-2 absolute right-4 top-4 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded-md ${
                            selectedDefect.severity === 'Critical' 
                              ? 'bg-rose-50 text-rose-800 border border-rose-100' 
                              : 'bg-amber-50 text-amber-800 border border-amber-100'
                          }`}>
                            {selectedDefect.severity} Severity Bug
                          </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-stone-900 leading-snug">
                          {selectedDefect.titleAmh}
                        </h2>
                        <p className="text-xs font-mono text-stone-400">{selectedDefect.titleEng}</p>
                      </div>

                      {/* Explanation details */}
                      <div className="space-y-3">
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/50 text-sm text-stone-700 leading-relaxed space-y-2">
                          <strong className="text-stone-900 font-semibold block flex items-center gap-1">
                            <Info className="w-4 h-4 text-amber-500" /> የስህተቱ ዝርዝር መግለጫ (Description):
                          </strong>
                          <p>{selectedDefect.descriptionAmh}</p>
                          <p className="text-xs text-stone-500 italic border-t border-stone-200/40 pt-2">{selectedDefect.descriptionEng}</p>
                        </div>

                        <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-200/40 text-sm text-emerald-950 leading-relaxed">
                          <strong className="text-emerald-900 font-semibold block mb-1">💡 እንዴት አስተካከልነው (Resolution applied in React Prototype):</strong>
                          <p>{selectedDefect.explanationAmh}</p>
                        </div>
                      </div>

                      {/* Code comparison grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Buggy Code block */}
                        <div className="border border-rose-100 rounded-2xl overflow-hidden shadow-xs">
                          <div className="bg-rose-50 p-3 border-b border-rose-100 flex justify-between items-center text-xs text-rose-900 font-bold">
                            <span>🚨 የነበረው ስህተት (Buggy Code)</span>
                          </div>
                          <div className="relative">
                            <pre className="p-4 bg-stone-950 text-rose-400 font-mono text-[11px] leading-relaxed overflow-x-auto h-48 rounded-b-2xl">
                              <code>{selectedDefect.buggyCode}</code>
                            </pre>
                            <button
                              onClick={() => handleCopyCode(selectedDefect.buggyCode, 'bug')}
                              className="absolute top-2 right-2 p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-all text-[10px] flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedId === 'bug' ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Fixed Code block */}
                        <div className="border border-emerald-100 rounded-2xl overflow-hidden shadow-xs">
                          <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center text-xs text-emerald-900 font-bold">
                            <span>✅ የተስተካከለው ኮድ (Fixed Code)</span>
                          </div>
                          <div className="relative">
                            <pre className="p-4 bg-stone-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto h-48 rounded-b-2xl">
                              <code>{selectedDefect.fixedCode}</code>
                            </pre>
                            <button
                              onClick={() => handleCopyCode(selectedDefect.fixedCode, 'fix')}
                              className="absolute top-2 right-2 p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-all text-[10px] flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedId === 'fix' ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedDefect(null)}
                          className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all"
                        >
                          ዝጋ (Close Analysis)
                        </button>
                      </div>

                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>

        {/* PERSONAL PASSWORD CHANGE MODAL */}
        <AnimatePresence>
          {isChangingPasswordOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="change-password-modal">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsChangingPasswordOpen(false);
                  setPasswordChangeSuccessMsg(null);
                  setPasswordChangeErrorMsg(null);
                  setNewPasswordInput('');
                }}
                className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs no-print"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className={`relative w-full max-w-md rounded-3xl p-6 border shadow-xl transition-all z-10 font-sans ${
                  themeMode === 'dark'
                    ? 'bg-stone-900 border-stone-800 text-stone-100 shadow-stone-950/80'
                    : 'bg-white border-stone-200 text-stone-950 shadow-2xl'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-500 animate-bounce" />
                    <h3 className="text-base font-black tracking-tight">🔐 የይለፍ ቃል መቀየር (Change Password)</h3>
                  </div>
                  <button 
                    onClick={() => {
                      playInteractiveSound('click');
                      setIsChangingPasswordOpen(false);
                      setPasswordChangeSuccessMsg(null);
                      setPasswordChangeErrorMsg(null);
                      setNewPasswordInput('');
                    }}
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-stone-400 hover:text-stone-600" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="space-y-4 text-left">
                  <div className="bg-stone-50 dark:bg-stone-950/40 p-3.5 rounded-2xl border border-stone-150 dark:border-stone-855 text-xs space-y-1">
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase block">ያለዎት የአሁኑ መለያ (Current Account)</span>
                    <p className="font-bold text-stone-800 dark:text-stone-200">{currentUser?.name || 'ተጠቃሚ'}</p>
                    <p className="font-mono text-stone-500">{currentUser?.email}</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 block mb-1.5 uppercase">አዲስ የይለፍ ቃል ያስገቡ (New Password)</label>
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="ቢያንስ 4 ፊደላት ወይም ቁጥሮች..."
                      className={`w-full bg-white dark:bg-stone-950 border text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-stone-800 dark:text-stone-200 font-black tracking-widest ${
                        themeMode === 'dark' ? 'border-stone-800' : 'border-stone-250'
                      }`}
                    />
                  </div>

                  {passwordChangeErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{passwordChangeErrorMsg}</span>
                    </div>
                  )}

                  {passwordChangeSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-1.5">
                      <span>✅</span>
                      <span>{passwordChangeSuccessMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        playInteractiveSound('click');
                        setIsChangingPasswordOpen(false);
                        setPasswordChangeSuccessMsg(null);
                        setPasswordChangeErrorMsg(null);
                        setNewPasswordInput('');
                      }}
                      className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-xs font-black rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all cursor-pointer text-stone-600 dark:text-stone-400"
                    >
                      ሰርዝ (Cancel)
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        playInteractiveSound('click');
                        setPasswordChangeErrorMsg(null);
                        setPasswordChangeSuccessMsg(null);

                        const passClean = newPasswordInput.trim();
                        if (passClean.length < 4) {
                          playInteractiveSound('wrong');
                          setPasswordChangeErrorMsg('የይለፍ ቃሉ ርዝመት ቢያንስ 4 ቁምፊዎች መሆን አለበት! (Password must be >= 4 chars)');
                          return;
                        }

                        try {
                          // Update the userAccounts state
                          const myEmail = currentUser?.email?.toLowerCase();
                          if (!myEmail) {
                            setPasswordChangeErrorMsg('መለያዎን ማረጋገጥ አልተቻለም (Could not identify account)');
                            return;
                          }

                          const accountExists = userAccounts.some(acc => acc.email.toLowerCase() === myEmail);
                          let updatedAccounts: UserAccount[] = [];

                          if (accountExists) {
                            updatedAccounts = userAccounts.map(acc => 
                              acc.email.toLowerCase() === myEmail ? { ...acc, password: passClean } : acc
                            );
                          } else {
                            // Account is missing from the list, register it
                            updatedAccounts = [
                              ...userAccounts,
                              {
                                email: myEmail,
                                password: passClean,
                                role: currentUser.role,
                                name: currentUser.name || currentUser.email
                              }
                            ];
                          }

                          setUserAccounts(updatedAccounts);
                          playInteractiveSound('success');
                          setPasswordChangeSuccessMsg('🔐 የይለፍ ቃልዎ በትክክል ተቀይሯል! (Password changed successfully)');
                          
                          setTimeout(() => {
                            setIsChangingPasswordOpen(false);
                            setPasswordChangeSuccessMsg(null);
                            setNewPasswordInput('');
                          }, 1500);

                        } catch (err: any) {
                          playInteractiveSound('wrong');
                          setPasswordChangeErrorMsg(err?.message || 'በማስቀመጥ ላይ ስህተት ተፈጥሯል (Error saving password)');
                        }
                      }}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      አስቀምጥ (Save Password)
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DESKTOP APPLICATION CONVERTER MODAL */}
        <AnimatePresence>
          {isDesktopAppModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="desktop-app-modal">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDesktopAppModalOpen(false)}
                className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs no-print"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className={`relative w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-xl transition-all z-10 font-sans ${
                  themeMode === 'dark'
                    ? 'bg-stone-900 border-stone-800 text-stone-100 shadow-stone-950/80'
                    : 'bg-white border-stone-200 text-stone-950 shadow-2xl'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-5 dark:border-stone-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-tight text-stone-900 dark:text-white">ወደ ኮምፒውተር መተግበሪያ ቀይር (Desktop App Mode)</h3>
                      <p className="text-[9px] text-stone-400 font-medium">Configure as standalone Application Software</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { playInteractiveSound('click'); setIsDesktopAppModalOpen(false); }}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                      themeMode === 'dark' 
                        ? 'border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-white' 
                        : 'border-stone-150 hover:bg-stone-100 text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-[11px] text-left leading-relaxed">
                  <p className={`${themeMode === 'dark' ? 'text-stone-300' : 'text-stone-600'}`}>
                    ይህንን የትምህርት ቤት ውጤት አስተዳደር ስርዓት (SaaS School System) በቀላሉ በኮምፒውተርዎ ላይ እንደ ራሱን የቻለ <strong>Application Software</strong> አድርገው በመጫን ያለ ኢንተርኔት አሳሽ (Chrome tabs) ቀጥታ በዴስክቶፕ አቋራጭ መጠቀም ይችላሉ።
                  </p>

                  {/* Option 1: Download bat script launcher */}
                  <div className={`p-4 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-stone-950/60 border-indigo-900/40 text-stone-200' : 'bg-indigo-50/30 border-indigo-100 text-indigo-950'
                  }`}>
                    <h4 className="font-black text-[12px] text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5">
                      <span>💻</span> አማራጭ ፩፦ የዊንዶውስ መተግበሪያ ማስነሻ (Windows Launcher Script)
                    </h4>
                    <p className="text-stone-500 dark:text-stone-400 mb-3 text-[10px]">
                      ይህንን ማስነሻ ፋይል በማውረድ ኮምፒውተርዎ ላይ ደብል ክሊክ ሲያደርጉ ሲስተሙን እንደ standalone desktop app ይከፍትልዎታል።
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        playInteractiveSound('success');
                        const currentUrl = window.location.origin + window.location.pathname + window.location.search;
                        const batContent = `@echo off\r\n` +
                                           `title ${schoolConfig.nameEng} Standalone Application\r\n` +
                                           `echo Loading school app in dedicated window mode...\r\n` +
                                           `start chrome --app="${currentUrl}"\r\n` +
                                           `exit\r\n`;
                        const blob = new Blob([batContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${schoolConfig.nameEng.replace(/\s+/g, '_')}_Launcher.bat`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-center flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ማስነሻ ፋይሉን አውርድ (.bat Launcher)</span>
                    </button>
                  </div>

                  {/* Option 2: Chrome standard PWA installation guide */}
                  <div className={`p-4 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-stone-950/60 border-amber-900/40 text-stone-200' : 'bg-amber-50/20 border-amber-100 text-amber-950'
                  }`}>
                    <h4 className="font-black text-[12px] text-amber-900 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <span>📱</span> አማራጭ ፪፦ በአሳሽዎ ላይ መተግበሪያውን መጫን (PWA App Installation)
                    </h4>
                    <p className="text-stone-500 dark:text-stone-400 mb-3 text-[10px]">
                      በChrome ወይም Edge አሳሽ ሲጠቀሙ ከላይ በስተቀኝ የ "Install" ምልክት በመጫን ወይም በመሳሪያ አሞሌው ውስጥ <strong>"Add to Homescreen"</strong> / <strong>"Install Page as App"</strong> በመምረጥ ራሱን የቻለ አፕ ማድረግ ይችላሉ።
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-stone-400">
                      <div className="bg-stone-950/40 p-2 rounded-lg border border-stone-850">
                        <strong className="text-stone-300 block">🖥️ ለዴስክቶፕ (Chrome)፦</strong>
                        Menu (ሦስቱ ነጥብ) ➡️ Save & Share ➡️ Install page as app
                      </div>
                      <div className="bg-stone-950/40 p-2 rounded-lg border border-stone-850">
                        <strong className="text-stone-300 block">📱 ለስልክ (Android/iOS)፦</strong>
                        Safari Share ➡️ Add to Home Screen ወይም Chrome Install App
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => { playInteractiveSound('click'); setIsDesktopAppModalOpen(false); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-white'
                        : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    ዝጋ (Close)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QR Scanner Modal for Quick Student Login and Attendance */}
        {isQRScannerOpen && (
          <QRScannerModal
            isOpen={isQRScannerOpen}
            onClose={() => setIsQRScannerOpen(false)}
            students={students}
            teachers={teachers}
            onLoginSuccess={handleQRLoginSuccess}
            onMarkAttendance={handleQRMarkAttendance}
          />
        )}

        {/* Student QR Card Modal for Save / Print */}
        <AnimatePresence>
          {selectedQRStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="print-qr-modal">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedQRStudent(null)}
                className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs no-print"
              />

              {/* Dynamic print-specific styles */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 0 !important;
                  }
                  body {
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  /* Hide all elements during print except the modal card */
                  body > :not(#print-qr-modal),
                  #root > :not(#print-qr-modal),
                  #root > div > *:not(#print-qr-modal) {
                    display: none !important;
                  }
                  #print-qr-modal {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100vh !important;
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    z-index: 9999999 !important;
                  }
                  #print-qr-modal > div {
                    background: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .print-card-box {
                    border: 2px solid #ddd !important;
                    box-shadow: none !important;
                    background: #1e1b4b !important; /* dark indigo indigo-950 */
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}} />

              {/* Modal Card wrapper */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative bg-stone-900 border border-stone-800 text-white w-full max-w-md p-6 rounded-3xl shadow-2xl z-10 space-y-6 max-h-[95vh] overflow-y-auto no-print print-card-box`}
              >
                {/* Modal Header (No-Print) */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 no-print">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-stone-200">የQR መታወቂያ ካርድ (QR ID Card)</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedQRStudent(null)}
                    className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer animate-fade-in"
                    title="ዝጋ (Close)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Printable ID Card */}
                <div className="flex justify-center py-4">
                  <div 
                    id="student-id-card"
                    className={`w-[320px] h-[480px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden border border-indigo-500/20 shadow-xl text-center select-none ${
                      schoolConfig.themeColor === 'indigo' ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950' :
                      schoolConfig.themeColor === 'emerald' ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950' :
                      schoolConfig.themeColor === 'violet' ? 'bg-gradient-to-br from-violet-950 via-slate-900 to-violet-950' :
                      schoolConfig.themeColor === 'amber' ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950' :
                      schoolConfig.themeColor === 'rose' ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950' :
                      'bg-gradient-to-br from-slate-950 via-stone-900 to-slate-950'
                    }`}
                  >
                    {/* Background Decorative Circles */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

                    {/* School Logo & Branding Header */}
                    <div className="space-y-1.5 z-10">
                      <div className="flex justify-center items-center gap-2">
                        {schoolConfig.logoType === 'graduation' ? (
                          <GraduationCap className={`w-8 h-8 ${
                            schoolConfig.themeColor === 'indigo' ? 'text-indigo-400' :
                            schoolConfig.themeColor === 'emerald' ? 'text-emerald-400' :
                            schoolConfig.themeColor === 'violet' ? 'text-violet-400' :
                            schoolConfig.themeColor === 'amber' ? 'text-amber-400' :
                            schoolConfig.themeColor === 'rose' ? 'text-rose-400' :
                            'text-slate-400'
                          }`} />
                        ) : schoolConfig.logoType === 'book' ? (
                          <BookOpen className={`w-8 h-8 ${
                            schoolConfig.themeColor === 'indigo' ? 'text-indigo-400' :
                            schoolConfig.themeColor === 'emerald' ? 'text-emerald-400' :
                            schoolConfig.themeColor === 'violet' ? 'text-violet-400' :
                            schoolConfig.themeColor === 'amber' ? 'text-amber-400' :
                            schoolConfig.themeColor === 'rose' ? 'text-rose-400' :
                            'text-slate-400'
                          }`} />
                        ) : schoolConfig.logoType === 'shield' ? (
                          <Shield className={`w-8 h-8 ${
                            schoolConfig.themeColor === 'indigo' ? 'text-indigo-400' :
                            schoolConfig.themeColor === 'emerald' ? 'text-emerald-400' :
                            schoolConfig.themeColor === 'violet' ? 'text-violet-400' :
                            schoolConfig.themeColor === 'amber' ? 'text-amber-400' :
                            schoolConfig.themeColor === 'rose' ? 'text-rose-400' :
                            'text-slate-400'
                          }`} />
                        ) : (
                          <Award className={`w-8 h-8 ${
                            schoolConfig.themeColor === 'indigo' ? 'text-indigo-400' :
                            schoolConfig.themeColor === 'emerald' ? 'text-emerald-400' :
                            schoolConfig.themeColor === 'violet' ? 'text-violet-400' :
                            schoolConfig.themeColor === 'amber' ? 'text-amber-400' :
                            schoolConfig.themeColor === 'rose' ? 'text-rose-400' :
                            'text-slate-400'
                          }`} />
                        )}
                        <span className="font-sans font-black text-xs uppercase tracking-wider text-stone-200">
                          {schoolConfig.nameEng}
                        </span>
                      </div>
                      
                      <div className="border-t border-indigo-500/20 pt-1">
                        <h4 className="text-sm font-black text-white tracking-tight">{schoolConfig.nameAmh}</h4>
                        <p className="text-[9px] italic text-stone-400 font-medium">{schoolConfig.mottoAmh || schoolConfig.mottoEng}</p>
                      </div>
                    </div>

                    {/* Student Info / Photo initials representation */}
                    <div className="flex flex-col items-center justify-center space-y-2 z-10">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black border-2 shadow-lg ${
                        schoolConfig.themeColor === 'indigo' ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300' :
                        schoolConfig.themeColor === 'emerald' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' :
                        schoolConfig.themeColor === 'violet' ? 'bg-violet-950/80 border-violet-500/40 text-violet-300' :
                        schoolConfig.themeColor === 'amber' ? 'bg-amber-950/80 border-amber-500/40 text-amber-300' :
                        schoolConfig.themeColor === 'rose' ? 'bg-rose-950/80 border-rose-500/40 text-rose-300' :
                        'bg-slate-900 border-slate-500/40 text-slate-300'
                      }`}>
                        {selectedQRStudent.name.substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div>
                        <h3 className="text-base font-black text-white leading-tight">{selectedQRStudent.name}</h3>
                        <span className="inline-block mt-1 px-3 py-0.5 bg-white/10 text-stone-200 font-extrabold text-[9px] rounded-full uppercase tracking-wider">
                          STUDENT (ተማሪ)
                        </span>
                      </div>
                    </div>

                    {/* Dynamic High-Contrast QR Code Wrapper */}
                    <div className="flex justify-center z-10">
                      <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-indigo-500/20">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedQRStudent.id)}`} 
                          alt={`QR code for student ${selectedQRStudent.id}`}
                          className="w-36 h-36"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* Bottom Metadata Badges */}
                    <div className="space-y-2 z-10">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-300">
                        <div className="bg-black/30 border border-white/5 py-1 px-2 rounded-xl">
                          <span className="text-[8px] text-stone-500 block uppercase font-bold">መታወቂያ (ID)</span>
                          <span className="font-mono font-black text-indigo-300">{selectedQRStudent.id}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 py-1 px-2 rounded-xl">
                          <span className="text-[8px] text-stone-500 block uppercase font-bold">ክፍል (Class)</span>
                          <span className="font-bold text-stone-200">{selectedQRStudent.grade} - {selectedQRStudent.section}</span>
                        </div>
                      </div>
                      
                      <p className="text-[8px] text-stone-500 leading-relaxed max-w-[240px] mx-auto">
                        ይህ መታወቂያ በትምህርት ቤቱ መግቢያ በር ላይ ለሚገኘው የQR መግቢያ እና አቴንዳንስ መመዝገቢያ የሚያገለግል ነው።
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Controls (No-Print) */}
                <div className="flex flex-col gap-2 pt-3 border-t border-stone-800 no-print">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        playInteractiveSound('click');
                        try {
                          const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedQRStudent.id)}`;
                          const response = await fetch(url);
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = `QR_Code_${selectedQRStudent.id}_${selectedQRStudent.name.replace(/\s+/g, '_')}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(blobUrl);
                          playInteractiveSound('success');
                        } catch (error) {
                          console.error('Failed programmatically downloading QR code:', error);
                          window.open(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedQRStudent.id)}`, '_blank');
                        }
                      }}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      QR አውርድ (Save QR)
                    </button>

                    <button
                      onClick={() => {
                        playInteractiveSound('success');
                        window.print();
                      }}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      ካርድ አትም (Print Card)
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedQRStudent(null)}
                    className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    ዝጋ (Close)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Official Printable Report Card Modal */}
        <AnimatePresence>
          {showPrintModal && foundStudent && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="print-report-modal">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPrintModal(false)}
                className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs no-print"
              />

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative ${themeMode === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-stone-900'} w-full max-w-4xl p-8 rounded-3xl shadow-2xl z-10 space-y-6 max-h-[95vh] overflow-y-auto`}
              >
                {/* CSS Print Stylesheet injected dynamically */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 0 !important;
                    }
                    body {
                      background: white !important;
                      color: black !important;
                      margin: 1.2cm !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    /* Hide all browser-rendered content under root during print */
                    body > :not(#print-report-modal),
                    #root > :not(#print-report-modal),
                    #root > div > *:not(#print-report-modal) {
                      display: none !important;
                    }
                    #print-report-modal {
                      position: absolute !important;
                      top: 0 !important;
                      left: 0 !important;
                      width: 100% !important;
                      height: auto !important;
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      overflow: visible !important;
                      display: block !important;
                      z-index: 9999999 !important;
                    }
                    /* Strip away all styling from the modal card wrapper */
                    #print-report-modal > div {
                      background: transparent !important;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      max-height: none !important;
                      overflow: visible !important;
                      width: 100% !important;
                    }
                    #print-target-sheet {
                      display: block !important;
                      position: relative !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      height: auto !important;
                      padding: 1.5cm !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      border: 8px double #1c1917 !important;
                      border-radius: 4px !important;
                      background-color: white !important;
                      page-break-after: always !important;
                      break-after: page !important;
                    }
                    #print-target-sheet table {
                      table-layout: auto !important;
                      width: 100% !important;
                      max-width: 100% !important;
                    }
                    #print-target-sheet th,
                    #print-target-sheet td {
                      white-space: nowrap !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                {/* Modal Actions */}
                <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 no-print">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                        </span>
                        <h3 className="text-lg font-black text-slate-900">🖨️ የውጤት መግለጫ ካርድ ማተሚያ (Report Card Preview)</h3>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={handleExportPDF}
                          disabled={isExportingPDF}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          {isExportingPDF ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>ፒዲኤፍ በመፍጠር ላይ...</span>
                            </>
                          ) : (
                            <>
                              <span>📄 ፒዲኤፍ አውርድ (Export as PDF)</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => { 
                            playInteractiveSound('click'); 
                            setPdfError(null); 
                            window.print(); 
                          }}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <span>🖨️ ወረቀት ላይ አትም (Print / PDF)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { playInteractiveSound('click'); setShowPrintModal(false); }}
                          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all"
                        >
                          ዝጋ (Close)
                        </button>
                      </div>
                      {pdfError && (
                        <span className="text-xs text-rose-600 font-bold self-end animate-pulse">⚠️ {pdfError}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-stone-200/60">
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
                              : 'text-stone-600 hover:text-stone-855'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" /> ዝርዝር (List View)
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 font-mono">
                      {previewViewType === 'card' ? 'A4 portrait sheet styling' : 'Scrollable item list styling'}
                    </span>
                  </div>
                </div>

                {/* ACTUAL DOCUMENT SHEET TO BE PRINTED OR PREVIEWED */}
                <div 
                  id="print-target-sheet" 
                  className="bg-[#faf8f2] p-5 md:p-6 max-w-2xl mx-auto shadow-xl rounded-xl border-4 border-double border-amber-800 text-stone-900 font-sans relative overflow-hidden select-none transition-all duration-300 print:break-after-page"
                  style={{ pageBreakAfter: 'always' }}
                >
                  {/* Dynamic CSS Print Stylesheet injected dynamically specifically for single A4 page fitting */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        size: A4 portrait !important;
                        margin: 4mm 4mm 4mm 4mm !important;
                      }
                      body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      /* Hide everything except the print-report-modal portal */
                      body > :not(#print-report-modal),
                      #root > :not(#print-report-modal),
                      #root > div > *:not(#print-report-modal),
                      .no-print {
                        display: none !important;
                        visibility: hidden !important;
                      }
                      #print-report-modal {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: #ffffff !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        z-index: 9999999 !important;
                      }
                      #print-report-modal > div {
                        background: transparent !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        width: 100% !important;
                      }
                      #print-target-sheet {
                        display: block !important;
                        position: relative !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 285mm !important; /* Strict A4 boundary check */
                        box-sizing: border-box !important;
                        padding: 6mm 8mm !important; /* Tight margins for zero spillover */
                        margin: 0 auto !important;
                        box-shadow: none !important;
                        border: 6px double #854d0e !important;
                        border-radius: 4px !important;
                        background-color: #faf8f2 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: always !important;
                        break-after: page !important;
                      }
                      /* Maintain high contrast for content on print */
                      #print-target-sheet * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                    }
                  `}} />

                  {/* Card View Layout Container */}
                  <div className={previewViewType === 'card' ? 'block' : 'hidden'}>
                    {/* Background Watermark/Logo pattern in print */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
                      {schoolConfig.logoType === 'graduation' && <GraduationCap className="w-80 h-80 text-amber-900" />}
                      {schoolConfig.logoType === 'book' && <BookOpen className="w-80 h-80 text-amber-900" />}
                      {schoolConfig.logoType === 'shield' && <ShieldCheck className="w-80 h-80 text-amber-900" />}
                      {schoolConfig.logoType === 'award' && <Award className="w-80 h-80 text-amber-900" />}
                    </div>

                    {/* Ribbon Banner for Outstanding Achievement (Honor Roll) */}
                    {(() => {
                      let totalSum = 0;
                      let subjectCount = 0;
                      schoolConfig.subjects.forEach(sub => {
                        const annual = getSubjectAnnualAvg(sub);
                        if (annual !== null) {
                          totalSum += annual;
                          subjectCount++;
                        }
                      });
                      const averageScore = subjectCount > 0 ? Math.round(totalSum / subjectCount) : 0;
                      
                      return averageScore >= 90 ? (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 shadow-xs uppercase tracking-wider rotate-[2deg] z-10 border border-amber-400">
                          <Sparkles className="w-3 h-3 animate-spin" /> የላቀ ውጤት (Honor Roll)
                        </div>
                      ) : null;
                    })()}

                    {/* Document Header */}
                    <div className="text-center border-b-2 border-stone-800 pb-2.5 mb-3 relative">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-2">
                          {schoolConfig.logoType === 'graduation' && <GraduationCap className="w-10 h-10 text-stone-800" />}
                          {schoolConfig.logoType === 'book' && <BookOpen className="w-10 h-10 text-stone-800" />}
                          {schoolConfig.logoType === 'shield' && <ShieldCheck className="w-10 h-10 text-stone-800" />}
                          {schoolConfig.logoType === 'award' && <Award className="w-10 h-10 text-stone-800" />}
                          <div>
                            <h1 className="text-lg md:text-xl font-black text-[#1e1b4b] tracking-tight leading-none uppercase font-display">{schoolConfig.nameAmh}</h1>
                            <h2 className="text-[11px] font-black text-[#854d0e] tracking-widest uppercase mt-0.5 font-display">{schoolConfig.nameEng}</h2>
                          </div>
                        </div>
                      </div>
                      <p className="text-[8.5px] italic text-stone-500 max-w-md mx-auto mt-1 leading-none font-serif">
                        “ {schoolConfig.mottoAmh} • {schoolConfig.mottoEng} ”
                      </p>
                      
                      <div className="flex justify-center gap-3 text-[8.5px] text-stone-400 font-bold mt-1.5 font-mono">
                        <span>📍 {schoolConfig.address}</span>
                        <span>📞 {schoolConfig.phone}</span>
                        <span>✉️ {schoolConfig.email}</span>
                      </div>

                      <div className="mt-2.5 inline-block bg-[#1e1b4b] text-amber-400 px-5 py-1 rounded-full text-[10px] font-black tracking-widest leading-none border border-amber-600/50 font-display font-black">
                        የተማሪ የውጤት ካርድ • STUDENT REPORT CARD
                      </div>
                    </div>

                    {/* Title of Document */}
                    <div className="text-center space-y-0.5 mb-2.5">
                      <h3 className="text-xs font-black text-[#1e1b4b] tracking-wider uppercase font-display">የተማሪ ውጤት መግለጫ ካርድ (Official Report Card)</h3>
                      <p className="text-[9px] font-mono font-bold text-stone-400">Academic Term: {schoolConfig.evaluationMode === 'quarter' ? 'Quarters Combined' : 'Semesters Combined'} - Year 2026</p>
                    </div>

                    {/* Student Details Info Block */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-[#fdfcf7] border border-[#e4dcbf] rounded-lg text-xs mb-3 relative">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#854d0e] rounded-l"></div>
                      <div>
                        <span className="text-[#854d0e] block text-[8px] font-black uppercase tracking-wider">የተማሪው ሙሉ ስም</span>
                        <strong className="text-[#1e1b4b] block text-xs font-black mt-0.5">{foundStudent.name}</strong>
                      </div>
                      <div>
                        <span className="text-[#854d0e] block text-[8px] font-black uppercase tracking-wider">ልዩ መታወቂያ (ID)</span>
                        <strong className="text-stone-950 block font-mono text-xs font-black mt-0.5">{foundStudent.id}</strong>
                      </div>
                      <div>
                        <span className="text-[#854d0e] block text-[8px] font-black uppercase tracking-wider">ክፍልና ደረጃ (Grade)</span>
                        <strong className="text-[#1e1b4b] block text-xs font-black mt-0.5">{foundStudent.grade} - {foundStudent.section}</strong>
                      </div>
                      <div>
                        <span className="text-[#854d0e] block text-[8px] font-black uppercase tracking-wider">ጾታ (Gender)</span>
                        <strong className="text-stone-950 block text-xs font-black mt-0.5">
                          {foundStudent.gender === 'Male' ? 'ወንድ (Male)' : 'ሴት (Female)'}
                        </strong>
                      </div>
                    </div>

                    {/* Main Report Table */}
                    <div className="border border-amber-800/40 rounded-lg overflow-hidden mb-3.5 shadow-xs">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#1e1b4b] text-amber-300 font-black border-b border-amber-800/60 text-[8.5px] uppercase tracking-wider font-display">
                            <th className="p-1.5 pl-2 border-r border-amber-800/20">ትምህርት አይነት (Subject)</th>
                            <th className="p-1.5 text-center border-r border-amber-800/20 w-24">Sem1 AVR (100)</th>
                            <th className="p-1.5 text-center border-r border-amber-800/20 w-24">Sem2 AVR (100)</th>
                            <th className="p-1.5 text-center border-r border-amber-800/20 w-28 bg-[#2e1065] text-amber-200 font-black">Annual AVR (100)</th>
                            <th className="p-1.5 text-center w-16">ደረጃ (Letter)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schoolConfig.subjects.map((sub, idx) => {
                            const s1 = getSubjectSem1Avg(sub);
                            const s2 = getSubjectSem2Avg(sub);
                            const annual = getSubjectAnnualAvg(sub);
                            const lg = annual !== null ? getLetterGrade(annual) : null;

                            return (
                              <tr key={sub} className={`border-b border-[#e4dcbf]/60 hover:bg-[#faf6e9] transition-colors text-[10.5px] ${idx % 2 === 1 ? 'bg-[#fcfaf2]' : 'bg-white'}`}>
                                <td className="p-1.5 pl-2 border-r border-[#e4dcbf]/60 font-black text-[#1e1b4b]">{sub}</td>
                                <td className="p-1.5 border-r border-[#e4dcbf]/60 text-center font-bold text-stone-800">
                                  {s1 !== null ? `${s1}%` : '-'}
                                </td>
                                <td className="p-1.5 border-r border-[#e4dcbf]/60 text-center font-bold text-stone-800">
                                  {s2 !== null ? `${s2}%` : '-'}
                                </td>
                                <td className="p-1.5 border-r border-[#e4dcbf]/60 text-center font-black bg-[#faf5e6] text-stone-950">
                                  {annual !== null ? `${annual}%` : '-'}
                                </td>
                                <td className="p-1.5 text-center font-black">
                                  {lg ? (
                                    <span className={`inline-block px-1.5 py-0.2 rounded-[3px] text-[8.5px] font-extrabold border leading-none ${lg.color}`}>
                                      {lg.label}
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Metrics & Conduct Card (Snug Dual Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 mt-2">
                      
                      {/* Left: Performance summary card */}
                      {(() => {
                        let sem1Sum = 0, sem1Count = 0;
                        let sem2Sum = 0, sem2Count = 0;
                        let annualSum = 0, annualCount = 0;

                        schoolConfig.subjects.forEach(sub => {
                          const s1 = getSubjectSem1Avg(sub);
                          const s2 = getSubjectSem2Avg(sub);
                          const annual = getSubjectAnnualAvg(sub);

                          if (s1 !== null) { sem1Sum += s1; sem1Count++; }
                          if (s2 !== null) { sem2Sum += s2; sem2Count++; }
                          if (annual !== null) { annualSum += annual; annualCount++; }
                        });

                        const sem1Avg = sem1Count > 0 ? Math.round(sem1Sum / sem1Count) : 0;
                        const sem2Avg = sem2Count > 0 ? Math.round(sem2Sum / sem2Count) : 0;
                        const annualAvg = annualCount > 0 ? Math.round(annualSum / annualCount) : 0;

                        return (
                          <div className="border border-[#e4dcbf] rounded-lg p-3 bg-white/80 shadow-2xs flex flex-col justify-between">
                            <div>
                              <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase mb-1.5 pb-0.5 border-b border-[#e4dcbf] font-display">
                                የውጤት ማጠቃለያ / PERFORMANCE SUMMARY
                              </h4>
                              <div className="space-y-1 text-[10.5px]">
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500 font-medium">Sem1 AVR አማካይ (Sem1 Avg):</span>
                                  <strong className="text-stone-800 font-black">
                                    {sem1Count > 0 ? `${sem1Avg}%` : '-'}
                                  </strong>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500 font-medium">Sem2 AVR አማካይ (Sem2 Avg):</span>
                                  <strong className="text-stone-800 font-black">
                                    {sem2Count > 0 ? `${sem2Avg}%` : '-'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-stone-200 mt-2 pt-1.5 space-y-1 text-[10.5px]">
                              <div className="flex justify-between items-center">
                                <span className="text-[#1e1b4b] font-black">ዓመታዊ አማካይ ውጤት (Annual Average %):</span>
                                <strong className="text-amber-950 font-black text-[11px] bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 leading-none">
                                  {annualCount > 0 ? `${annualAvg}%` : '0%'}
                                </strong>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-stone-500 font-medium">ጠቅላላ የትምህርት ብዛት (Subjects):</span>
                                <strong className="text-stone-800 font-bold">
                                  {schoolConfig.subjects.length}
                                </strong>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-stone-950 font-black">ውሳኔ (Decision):</span>
                                <strong className={`font-black text-[10px] px-1.5 py-0.2 rounded leading-none ${
                                  annualAvg >= 50 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {annualAvg >= 50 ? 'ያለፈ / Promoted 🎉' : 'Needs Support ⚠️'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Right: Behavioral and extra info */}
                      <div className="border border-[#e4dcbf] rounded-lg p-3 bg-white/80 shadow-2xs flex flex-col justify-between">
                        <div>
                          <h4 className="text-[10px] font-black text-[#1e1b4b] uppercase mb-1 pb-0.5 border-b border-[#e4dcbf] font-display">
                            📋 ምግባርና አቴንዳንስ (Conduct & Attendance)
                          </h4>
                          <div className="space-y-1 text-[10.5px]">
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-stone-500 font-semibold">ምግባር (Conduct Standard):</span>
                              <strong className="text-emerald-700 font-black text-[11px]">
                                {studentExtraInfo[foundStudent.id]?.conduct || 'A'}
                              </strong>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-stone-500 font-semibold">የቀሪ ቀናት ብዛት (Absence Days):</span>
                              <strong className="text-[#1e1b4b] font-black text-[11px]">
                                {studentExtraInfo[foundStudent.id]?.absent || 0} ቀናት
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-stone-200 pt-1.5">
                          <div className="grid grid-cols-3 gap-1.5 text-center text-[8.5px] bg-white p-1 rounded border border-stone-200">
                            <div>
                              <span className="text-stone-400 block font-bold leading-tight">ጠቅላላ ቀናት</span>
                              <strong className="text-stone-700 font-bold">180</strong>
                            </div>
                            <div>
                              <span className="text-stone-400 block font-bold leading-tight">የቀረበት</span>
                              <strong className="text-rose-700 font-black">{studentExtraInfo[foundStudent.id]?.absent || 0} ቀን</strong>
                            </div>
                            <div>
                              <span className="text-stone-400 block font-bold leading-tight">የተገኘበት</span>
                              <strong className="text-emerald-700 font-black">{180 - (studentExtraInfo[foundStudent.id]?.absent || 0)} ቀን</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Decision & Official Stamp Section */}
                    {(() => {
                      let totalSum = 0;
                      let subjectCount = 0;
                      schoolConfig.subjects.forEach(sub => {
                        const annual = getSubjectAnnualAvg(sub);
                        if (annual !== null) {
                          totalSum += annual;
                          subjectCount++;
                        }
                      });
                      const averageScore = subjectCount > 0 ? Math.round(totalSum / subjectCount) : 0;
                      const cardPass = averageScore >= 50;

                      return (
                        <div className="grid grid-cols-2 gap-4 items-center border-t border-b border-[#e4dcbf] py-2 my-2.5 bg-[#faf8f2]/60">
                          {/* Left: Decision Stamp */}
                          <div className="flex justify-start pl-2">
                            {subjectCount > 0 ? (
                              cardPass ? (
                                <div className="border-4 border-double border-emerald-600 text-emerald-700 px-3.5 py-1 rounded-md text-center rotate-[-1.5deg] select-none inline-block font-black tracking-widest uppercase bg-emerald-50/20 shadow-2xs">
                                  <div className="text-xs font-black leading-none">ያለፈ / PROMOTED</div>
                                  <div className="text-[6.5px] font-extrabold tracking-normal mt-0.5">የርዕሰ መምህራን ምክር ቤት ውሳኔ • SCHOOL BOARD</div>
                                </div>
                              ) : (
                                <div className="border-4 border-double border-rose-600 text-rose-700 px-3.5 py-1 rounded-md text-center rotate-[-1.5deg] select-none inline-block font-black tracking-widest uppercase bg-rose-50/20 shadow-2xs">
                                  <div className="text-xs font-black leading-none">ያልተመረቀ / RETAINED</div>
                                  <div className="text-[6.5px] font-extrabold tracking-normal mt-0.5">የርዕሰ መምህራን ምክር ቤት ውሳኔ • SCHOOL BOARD</div>
                                </div>
                              )
                            ) : (
                              <span className="text-stone-400 font-bold text-[10px] italic">በቂ ውጤት አልተመዘገበም (Insufficient Data)</span>
                            )}
                          </div>

                          {/* Right: Circular Official stamp of school */}
                          <div className="flex justify-end pr-2">
                            <div className="relative w-20 h-20 rounded-full border-4 border-double border-blue-600/75 flex flex-col items-center justify-center p-1.5 text-center select-none rotate-[-3deg] bg-blue-50/10 shrink-0 font-sans shadow-2xs">
                              <div className="absolute inset-1 rounded-full border border-dashed border-blue-600/60"></div>
                              <span className="text-[5.5px] font-black uppercase tracking-wider text-blue-600/80 leading-none">{schoolConfig.nameAmh}</span>
                              <span className="text-[5.5px] font-bold text-blue-600/60 my-0.2">★ OFFICIAL ★</span>
                              <span className="text-[6.5px] font-extrabold text-blue-600/80 tracking-widest leading-none border border-blue-600/50 px-1 py-0.2 rounded-xs bg-white/40">APPROVED</span>
                              <span className="text-[5px] font-black text-blue-600/70 uppercase tracking-widest mt-0.5">Addis Ababa, ET</span>
                              <span className="absolute text-[6.5px] font-serif italic text-blue-800/80 font-bold bottom-1.5 right-3 transform rotate-[15deg]">Yonas K.</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Official Signatures footer placeholder */}
                    <div className="grid grid-cols-2 gap-8 text-[11px] text-center pt-1.5 mt-2.5">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-2/3 border-b border-stone-400 flex items-end justify-center">
                          <span className="font-serif italic text-[#1e1b4b] font-bold text-xs leading-none">Girma_B</span>
                        </div>
                        <span className="text-[9.5px] font-black text-stone-700 mt-1">የክፍል ኃላፊ መምህር ፊርማ</span>
                        <span className="text-[8px] text-stone-400 font-mono">Home Room Teacher Signature</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-2/3 border-b border-stone-400 flex items-end justify-center">
                          <span className="font-serif italic text-[#1e1b4b] font-bold text-xs leading-none">Yonas K.</span>
                        </div>
                        <span className="text-[9.5px] font-black text-stone-700 mt-1">የርዕሰ መምህር ፊርማ እና ማህተም</span>
                        <span className="text-[8px] text-stone-400 font-mono">Director Signature / Seal</span>
                      </div>
                    </div>
                    {/* End of Card View Layout Container */}
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
                              {schoolConfig.nameAmh || 'ኪብር መካከለኛ ደረጃ ትምህርት ቤት'}
                            </h1>
                            <p className="text-[10px] font-mono font-bold text-stone-400 mt-1 uppercase">
                              {schoolConfig.nameEng || 'KIBR MIDDLE SCHOOL'}
                            </p>
                            <p className="text-xs font-semibold text-stone-500 italic mt-0.5">
                              “ {schoolConfig.mottoAmh || 'ለክህሎትና ለውጤታማነት እንተጋለን!'} ”
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-right text-xs self-start md:self-auto">
                          <span className="text-stone-400 block text-[9px] font-bold uppercase">የተማሪ መለያ / Student ID</span>
                          <strong className="text-stone-900 font-mono font-black text-sm">{foundStudent.id}</strong>
                        </div>
                      </div>

                      {/* Student Bio Strip */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">የተማሪው ስም (Student Name)</span>
                          <strong className="text-stone-900 font-black text-xs block mt-0.5">{foundStudent.name}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ክፍልና ደረጃ (Grade / Sec)</span>
                          <strong className="text-stone-900 font-extrabold text-xs block mt-0.5">{foundStudent.grade} - {foundStudent.section}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ክፍለ ጊዜ (Term / Year)</span>
                          <strong className="text-stone-900 font-extrabold text-xs block mt-0.5 capitalize">
                            Active Term Report
                          </strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[9px] font-bold uppercase">ውሳኔ (Result Status)</span>
                          <strong className={`font-black text-xs block mt-0.5 ${
                            (foundGrades.reduce((sum, item) => sum + item.total, 0) / (foundGrades.length || 1)) >= 50
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}>
                            {(foundGrades.reduce((sum, item) => sum + item.total, 0) / (foundGrades.length || 1)) >= 50
                              ? '✅ PASS (ያለፈ)'
                              : '❌ NEEDS SUPPORT'}
                          </strong>
                        </div>
                      </div>

                      {/* List of Subjects */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <List className="w-4 h-4 text-indigo-600" /> የትምህርት ውጤት ዝርዝር (List of Academic Achievements)
                        </h3>
                        
                        {schoolConfig.subjects.map(sub => {
                          const s1 = getSubjectSem1Avg(sub);
                          const s2 = getSubjectSem2Avg(sub);
                          const annual = getSubjectAnnualAvg(sub);
                          
                          const getLetterGradeLocal = (score: number) => {
                            if (score >= 90) return { grade: 'A+', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
                            if (score >= 83) return { grade: 'A', color: 'text-emerald-600 bg-emerald-50/50 border-emerald-150' };
                            if (score >= 75) return { grade: 'B+', color: 'text-teal-700 bg-teal-50 border-teal-200' };
                            if (score >= 68) return { grade: 'B', color: 'text-teal-600 bg-teal-50/50 border-teal-150' };
                            if (score >= 60) return { grade: 'C+', color: 'text-amber-700 bg-amber-50 border-amber-200' };
                            if (score >= 50) return { grade: 'C', color: 'text-amber-600 bg-amber-50/50 border-amber-150' };
                            if (score >= 40) return { grade: 'D', color: 'text-orange-600 bg-orange-50 border-orange-200' };
                            return { grade: 'F', color: 'text-rose-700 bg-rose-50 border-rose-200' };
                          };

                          const letter = annual !== null ? getLetterGradeLocal(annual) : null;

                          return (
                            <div key={sub} className="bg-white hover:bg-stone-50 border border-stone-200 hover:border-indigo-200 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">📖</span>
                                  <div>
                                    <strong className="text-stone-900 font-extrabold text-sm">{sub}</strong>
                                    <span className="block text-[10px] text-stone-400 font-medium">Subject Evaluation</span>
                                  </div>
                                </div>
                              </div>

                              {/* Assessment Breakdown List */}
                              <div className="flex flex-wrap gap-2.5 items-center bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-150 text-xs">
                                <div className="text-center px-1">
                                  <span className="text-[8px] font-bold text-stone-400 uppercase block">Sem1 AVR</span>
                                  <strong className="text-stone-800 font-extrabold">{s1 !== null ? `${s1}%` : '-'}</strong>
                                </div>
                                <div className="h-6 w-px bg-stone-200"></div>
                                <div className="text-center px-1">
                                  <span className="text-[8px] font-bold text-stone-400 uppercase block">Sem2 AVR</span>
                                  <strong className="text-stone-800 font-extrabold">{s2 !== null ? `${s2}%` : '-'}</strong>
                                </div>
                                <div className="h-6 w-px bg-stone-200"></div>
                                <div className="text-center px-1">
                                  <span className="text-[8px] font-bold text-indigo-500 uppercase block">Annual AVR</span>
                                  <strong className="text-indigo-950 font-black">{annual !== null ? `${annual}%` : '-'}</strong>
                                </div>
                              </div>

                              {/* Subject grade outcome */}
                              <div className="flex items-center gap-3 justify-end min-w-[120px]">
                                <div className="text-center">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase block">ፊደል</span>
                                  {letter ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black border ${letter.color}`}>
                                      {letter.grade}
                                    </span>
                                  ) : '-'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Overall Metrics block */}
                      {(() => {
                        let totalSum = 0;
                        let subjectCount = 0;
                        schoolConfig.subjects.forEach(sub => {
                          const annual = getSubjectAnnualAvg(sub);
                          if (annual !== null) {
                            totalSum += annual;
                            subjectCount++;
                          }
                        });
                        const averageScore = subjectCount > 0 ? Math.round(totalSum / subjectCount) : 0;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                              <h4 className="text-xs font-black text-stone-900 uppercase">የውጤት ማጠቃለያ (Metrics Summary)</h4>
                              <div className="flex justify-between text-xs py-1 border-b border-stone-150">
                                <span className="text-stone-500">ጠቅላላ የትምህርት ብዛት (Total Subjects):</span>
                                <strong className="text-indigo-900 font-black">{schoolConfig.subjects.length}</strong>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-stone-500">ዓመታዊ አማካይ ውጤት (Annual Average):</span>
                                <strong className="text-stone-950 font-black">
                                  {subjectCount > 0 ? `${averageScore}%` : '0%'}
                                </strong>
                              </div>
                            </div>

                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                              <h4 className="text-xs font-black text-stone-900 uppercase">ስነ-ምግባርና መገኘት (Conduct & Attendance)</h4>
                              <div className="flex justify-between text-xs py-1 border-b border-stone-150">
                                <span className="text-stone-500">ሥነ-ምግባር ደረጃ (Conduct Grade):</span>
                                <strong className="text-emerald-700 font-black">{studentExtraInfo[foundStudent.id]?.conduct || 'A'}</strong>
                              </div>
                              <div className="flex justify-between text-xs py-1">
                                <span className="text-stone-500">የቀረበት ቀናት (Days Absent):</span>
                                <strong className="text-rose-700 font-black">{studentExtraInfo[foundStudent.id]?.absent || 0} ቀን (Days)</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Signatures Row */}
                      <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-stone-200">
                        <div className="flex flex-col items-center">
                          <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Approved</span>
                          <span className="text-[10px] font-bold text-stone-700 mt-1">የክፍል ኃላፊ መምህር (Homeroom Teacher)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Official Stamp</span>
                          <span className="text-[10px] font-bold text-stone-700 mt-1">የርዕሰ መምህር (Director Seal)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Print instructions notice in modal footer */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[10px] text-stone-500 leading-relaxed font-semibold flex items-start gap-1.5 no-print">
                  <span>💡</span>
                  <p>
                    <strong>ጠቃሚ ምክር፡</strong> &ldquo;ወረቀት ላይ አትም&rdquo; የሚለውን ሲጫኑ የብሮውዘሩ የህትመት ገጽ ይከፈታል። በዚያ ገጽ ላይ <strong>&quot;Headers and Footers&quot;</strong> የሚለውን ማጥፋትዎን እና <strong>&quot;Background Graphics&quot;</strong> የሚለውን ማብራትዎን ያረጋግጡ። ይህም የትምህርት ቤቱን አርማና ጌጦች በተሟላ ውበት ለማተም ይረዳል።
                  </p>
                </div>

              </motion.div>
            </div>,
            document.body
          )}
        </AnimatePresence>

      {/* ================= OFFSCREEN ATTENDANCE PDF TARGET ================= */}
      {exportingAttendanceStudent && (
        <div className="absolute left-[-9999px] top-[-9999px] w-[210mm] min-h-[297mm] bg-white text-stone-900 font-sans p-12 space-y-6 flex flex-col justify-between" id="attendance-print-target">
          <div>
            {/* Header portion */}
            <div className="text-center border-b-2 border-stone-950 pb-5 relative space-y-2">
              <div className="flex items-center justify-center gap-3">
                {schoolConfig.logoType === 'graduation' && <GraduationCap className="w-12 h-12 text-stone-800" />}
                {schoolConfig.logoType === 'book' && <BookOpen className="w-12 h-12 text-stone-800" />}
                {schoolConfig.logoType === 'shield' && <ShieldCheck className="w-12 h-12 text-stone-800" />}
                {schoolConfig.logoType === 'award' && <Award className="w-12 h-12 text-stone-800" />}
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-stone-950">{schoolConfig.nameAmh}</h1>
                  <h2 className="text-lg font-bold tracking-wide text-stone-700 uppercase">{schoolConfig.nameEng}</h2>
                </div>
              </div>
              <p className="text-xs italic font-semibold text-stone-500">“ {schoolConfig.mottoAmh} • {schoolConfig.mottoEng} ”</p>
              
              <div className="text-[10px] text-stone-500 font-medium pt-1.5 flex justify-center gap-6">
                <span>📞 {schoolConfig.phone}</span>
                <span>📧 {schoolConfig.email}</span>
                <span>📍 {schoolConfig.address}</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center pt-4">
              <span className="text-[10px] text-indigo-700 font-black tracking-widest uppercase block">የተማሪ ዕለታዊ መከታተያ መዝገብ</span>
              <h3 className="text-base font-black text-stone-900">የዕለታዊ አቴንዳንስ መዝገብ ሪፖርት (Student Daily Attendance History)</h3>
            </div>

            {/* Profile info cards */}
            <div className="grid grid-cols-2 gap-4 mt-6 bg-stone-50 p-5 rounded-xl border border-stone-200 text-xs">
              <div className="space-y-1.5 border-r border-stone-200 pr-4 text-left">
                <p><span className="font-bold text-stone-500">የተማሪው ስም (Student Name)፡</span> <strong className="text-stone-950 font-black">{exportingAttendanceStudent.name}</strong></p>
                <p><span className="font-bold text-stone-500">መታወቂያ ቁጥር (ID Number)፡</span> <strong className="text-indigo-900 font-black font-mono">{exportingAttendanceStudent.id}</strong></p>
                <p><span className="font-bold text-stone-500">ክፍል እና ሴክሽን (Grade & Section)፡</span> <strong className="text-stone-900 font-black">{exportingAttendanceStudent.grade} {exportingAttendanceStudent.section}</strong></p>
              </div>
              <div className="space-y-1.5 pl-4 text-left">
                <p><span className="font-bold text-stone-500">የመቅረት ብዛት (Days Absent)፡</span> <strong className="text-rose-700 font-black">{studentExtraInfo[exportingAttendanceStudent.id]?.absent ?? 0} ቀናት (Days)</strong></p>
                <p><span className="font-bold text-stone-500">የምግባር ደረጃ (Conduct Score)፡</span> <strong className="text-emerald-700 font-black">{studentExtraInfo[exportingAttendanceStudent.id]?.conduct ?? 'A'}</strong></p>
                <p><span className="font-bold text-stone-500">ጠቅላላ መዝገቦች (Total Logs)፡</span> <strong className="text-stone-950 font-black">{exportingAttendanceHistory.length} ቀናት (Days)</strong></p>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 border border-stone-300 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 uppercase font-bold text-[10px] tracking-wider border-b border-stone-300">
                    <th className="p-3 w-12 text-center">ተ.ቁ</th>
                    <th className="p-3">📅 ቀን በአውሮፓውያን (Gregorian Date)</th>
                    <th className="p-3">🇪🇹 ቀን በኢትዮጵያ (Ethiopian Date)</th>
                    <th className="p-3 text-center">ሁኔታ (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {exportingAttendanceHistory.map((h, idx) => {
                    const dateObj = new Date(h.date + 'T12:00:00');
                    const dual = getFormattedDualCalendarDate(dateObj);
                    return (
                      <tr key={idx} className="text-stone-800">
                        <td className="p-3 text-center font-mono font-bold text-stone-500 bg-stone-50/40">{idx + 1}</td>
                        <td className="p-3 font-mono">{dual.gc}</td>
                        <td className="p-3 font-bold">{dual.ec}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            h.status === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            h.status === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                            'bg-amber-50 text-amber-800 border border-amber-100'
                          }`}>
                            {h.status === 'present' ? '✓ የመጣ (Present)' :
                             h.status === 'absent' ? '✗ የቀረ (Absent)' :
                             '✏ ፈቃድ (Excused)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center pt-8 border-t border-stone-200 mt-auto">
            <div className="flex flex-col items-center">
              <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Approved</span>
              <span className="text-[10px] font-bold text-stone-700 mt-1">የክፍል ኃላፊ መምህር (Homeroom Teacher)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-serif italic text-indigo-800 text-xs border-b border-stone-300 pb-1 w-2/3">Official Stamp</span>
              <span className="text-[10px] font-bold text-stone-700 mt-1">የርዕሰ መምህር (Director Seal)</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE GENERATING OVERLAY ================= */}
      {isExportingAttendancePDF && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-stone-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white/95 border border-stone-200/50 rounded-2xl p-8 max-w-sm text-center shadow-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-600 absolute animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-stone-900 text-sm">የአቴንዳንስ ፒዲኤፍ እየተዘጋጀ ነው...</h4>
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Generating A4 Attendance PDF</p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs">
              እባክዎን ትንሽ ይጠብቁ፤ የልጅዎ አቴንዳንስ መዝገብ ወደ ፒዲኤፍ እየተቀየረ ነው።
            </p>
          </div>
        </div>
      )}

      {/* ================= EDIT STUDENT MAIN MODAL ================= */}
      {editingStudentMainTab && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex justify-between items-center">
              <span className="font-extrabold text-stone-800 text-sm font-sans">የተማሪ መረጃ ማስተካከያ (Edit Student Profile)</span>
              <button 
                onClick={() => { playInteractiveSound('click'); setEditingStudentMainTab(null); }}
                className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditStudentMainSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የተማሪው ሙሉ ስም (Student Full Name):</label>
                <input 
                  type="text"
                  value={editStudentMainName}
                  onChange={(e) => setEditStudentMainName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ጾታ (Gender):</label>
                  <select 
                    value={editStudentMainGender}
                    onChange={(e) => setEditStudentMainGender(e.target.value as any)}
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
                    value={editStudentMainAge}
                    onChange={(e) => setEditStudentMainAge(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                    placeholder="14"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ክፍል (Grade):</label>
                  <select 
                    value={editStudentMainGrade}
                    onChange={(e) => setEditStudentMainGrade(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                  >
                    {activeGradesList.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">ሴክሽን (Sec):</label>
                  <select 
                    value={editStudentMainSection}
                    onChange={(e) => setEditStudentMainSection(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 outline-none bg-white font-medium"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ኢሜል (Parent Email):</label>
                  <input 
                    type="email"
                    value={editStudentMainParentEmail}
                    onChange={(e) => setEditStudentMainParentEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-600 mb-1">የወላጅ ስልክ (Parent Phone):</label>
                  <input 
                    type="tel"
                    value={editStudentMainParentPhone}
                    onChange={(e) => setEditStudentMainParentPhone(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none bg-stone-50/50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { playInteractiveSound('click'); setEditingStudentMainTab(null); }}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  ይቅር (Cancel)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  አስቀምጥ (Save Changes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE STUDENT MAIN CONFIRMATION MODAL ================= */}
      {deletingStudentMainTab && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-stone-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-stone-950 text-sm">ተማሪውን ከሲስተሙ መሰረዝ ይፈልጋሉ?</h4>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Confirm Student Deletion / Departure</p>
              </div>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed">
              ተማሪ <strong>{deletingStudentMainTab.name}</strong> (መታወቂያ፡ {deletingStudentMainTab.id}) ከሲስተሙ ሲሰረዝ ተያያዥነት ያላቸው ውጤቶችና መዛግብት በሙሉ ይወገዳሉ። ይህ ተግባር ሊመለስ የማይችል ነው።
            </p>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => { playInteractiveSound('click'); setDeletingStudentMainTab(null); }}
                className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
              >
                ይቅር (Cancel)
              </button>
              <button
                onClick={handleDeleteStudentMainConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                አዎ፣ ሰርዝ (Yes, Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL PDF DOWNLOAD MODAL ================= */}
      {downloadablePdf && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm shadow-2xl border border-stone-200 dark:border-stone-850 overflow-hidden flex flex-col p-6 space-y-4 text-center items-center">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full animate-pulse">
              <Download className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-stone-950 dark:text-stone-50 text-sm">📥 ፒዲኤፍ ለማውረድ ተዘጋጅቷል!</h4>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">{downloadablePdf.title}</p>
            </div>
            
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              በአሳሽዎ የደህንነት ጥበቃ ምክንያት ፒዲኤፍ ፋይሉ በራሱ ካልወረደ፣ እባክዎ ከታች ያለውን <strong>"ፒዲኤፍ አውርድ"</strong> የሚለውን ሊንክ በመጫን በቀጥታ ማውረድ ይችላሉ።
            </p>

            <div className="w-full flex flex-col gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <a
                href={downloadablePdf.url}
                download={downloadablePdf.filename}
                onClick={() => {
                  playInteractiveSound('success');
                  // Auto close after 1.5 seconds so they know it downloaded
                  setTimeout(() => setDownloadablePdf(null), 1500);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                <Download className="w-3.5 h-3.5" /> ፒዲኤፍ አውርድ (Click to Download)
              </a>
              <button
                type="button"
                onClick={() => { playInteractiveSound('click'); setDownloadablePdf(null); }}
                className="w-full py-2 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 rounded-xl text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-950 transition-colors cursor-pointer"
              >
                ዝጋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

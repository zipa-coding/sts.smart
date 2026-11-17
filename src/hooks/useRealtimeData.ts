import { useEffect, useState, useMemo, useCallback } from "react";
import {
  realtimeStore,
  RealtimeCollectionName,
  RealtimeStoreSnapshot,
  ConnectionStatus,
} from "../lib/realtimeStore";
import { tentukanPredikatLabel } from "../lib/predikat";

const SUBJECTS_LIST = [
  "PAI",
  "PPKN",
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Inggris",
  "PJOK",
  "Prakarya",
  "Informatika",
  "Bahasa Arab",
  "Tahsin ABaTaTsa",
  "Tahfizh Al-Qur’an",
  "Do’a Harian dan Hadits",
  "Wudhu dan Sholat",
];

/**
 * Subscribes to the requested Firestore collections via the shared singleton realtimeStore.
 * Guarantees 1 listener per collection across the entire application and unsubscribes on unmount.
 */
export function useRealtimeData(collections: RealtimeCollectionName[]) {
  const collectionsKey = useMemo(() => {
    const unique = Array.from(new Set(collections));
    unique.sort();
    return unique.join(",");
  }, [collections]);

  const stableCollections = useMemo(
    () => (collectionsKey ? (collectionsKey.split(",") as RealtimeCollectionName[]) : []),
    [collectionsKey]
  );

  const [snapshot, setSnapshot] = useState<RealtimeStoreSnapshot>(() =>
    realtimeStore.getSnapshot()
  );

  useEffect(() => {
    if (stableCollections.length === 0) return;

    const handleUpdate = () => {
      setSnapshot(realtimeStore.getSnapshot());
    };

    const unsubscribeCols = realtimeStore.subscribeCollections(
      stableCollections,
      handleUpdate
    );
    const unsubscribeStatus = realtimeStore.subscribeStatus(handleUpdate);

    // Sync initial state right after attaching
    setSnapshot(realtimeStore.getSnapshot());

    return () => {
      unsubscribeCols();
      unsubscribeStatus();
    };
  }, [stableCollections]);

  const loading = useMemo(() => {
    for (const col of stableCollections) {
      if (!snapshot.loadedCollections[col] && !snapshot.collectionErrors[col]) {
        return true;
      }
    }
    return false;
  }, [stableCollections, snapshot.loadedCollections, snapshot.collectionErrors]);

  const error = useMemo(() => {
    for (const col of stableCollections) {
      if (snapshot.collectionErrors[col]) {
        return snapshot.collectionErrors[col] || null;
      }
    }
    return null;
  }, [stableCollections, snapshot.collectionErrors]);

  const refresh = useCallback(() => {
    setSnapshot(realtimeStore.getSnapshot());
  }, []);

  return {
    ...snapshot,
    students: snapshot.students || [],
    grades: snapshot.grades || [],
    walikelasNotes: snapshot.walikelas_notes || {},
    tpTemplatesMap: snapshot.tujuan_pembelajaran_templates || {},
    ekskul: snapshot.ekskul || [],
    teachers: snapshot.teachers || [],
    loading,
    error,
    refresh,
  };
}

/**
 * Hook specifically for the header connection status indicator ("Tersambung", "Menyinkronkan", "Offline")
 * and active listener count diagnostics without attaching new Firestore listeners.
 */
export function useConnectionStatus(): {
  connectionStatus: ConnectionStatus;
  isOffline: boolean;
  activeListenerCount: number;
  activeCollections: RealtimeCollectionName[];
  activeListeners: RealtimeCollectionName[];
  lastSyncAt: string | null;
} {
  const [snap, setSnap] = useState(() => realtimeStore.getSnapshot());

  useEffect(() => {
    const update = () => setSnap(realtimeStore.getSnapshot());
    const unsub = realtimeStore.subscribeStatus(update);
    update();
    return unsub;
  }, []);

  return {
    connectionStatus: snap.connectionStatus,
    isOffline: snap.isOffline,
    activeListenerCount: snap.activeListenerCount,
    activeCollections: snap.activeCollections,
    activeListeners: snap.activeCollections,
    lastSyncAt: snap.lastSyncAt,
  };
}

/**
 * Computes the DashboardProgress summary in real time from the shared
 * students, grades, and teachers listeners without repeated getDocs calls.
 */
export function useRealtimeSummary() {
  const {
    students,
    grades,
    teachers,
    loading,
    error,
    connectionStatus,
    isOffline,
    lastSyncAt,
  } = useRealtimeData(["students", "grades", "teachers"]);

  const summary = useMemo(() => {
    const totalStudents = students.length;

    const normalizeSub = (str: string) =>
      String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const matchesStudent = (g: any, s: any) => {
      if (!g || !s) return false;
      return String(g.studentId || "").trim() === String(s.id || "").trim();
    };

    const subjectProgress = SUBJECTS_LIST.map((sub) => {
      const targetNorm = normalizeSub(sub);
      const filledGradesForSub = grades.filter((g: any) => {
        const isSubMatch = normalizeSub(g.subject) === targetNorm || g.subject === sub;
        const isStudentMatch = students.some((s: any) => matchesStudent(g, s));
        return isSubMatch && isStudentMatch;
      });
      const completedCount = filledGradesForSub.length;
      const percentage =
        totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
      const t = teachers.find(
        (teach: any) => normalizeSub(teach.subject) === targetNorm || teach.subject === sub
      );
      return {
        subject: sub,
        completed: completedCount,
        total: totalStudents,
        percent: percentage,
        teacherName: t ? t.name : "Belum Ditugaskan",
      };
    });

    const classSet = new Set(["7", "8", "9"]);
    students.forEach((s: any) => {
      const k = String(s.kelas || "").trim();
      if (k) classSet.add(k);
    });
    const classes = Array.from(classSet).sort();

    const classProgress = classes.map((cls) => {
      const studentsInClass = students.filter(
        (s: any) => String(s.kelas || "").trim() === cls
      );
      const totalGradesNeeded = studentsInClass.length * SUBJECTS_LIST.length;
      let gradesFilledCount = 0;

      studentsInClass.forEach((s: any) => {
        const studentGrades = grades.filter((g: any) => matchesStudent(g, s));
        gradesFilledCount += studentGrades.length;
      });

      const percent =
        totalGradesNeeded > 0
          ? Math.round((gradesFilledCount / totalGradesNeeded) * 100)
          : 0;
      const waliKelas = teachers.find(
        (teach: any) => teach.isWaliKelas && String(teach.kelas || "").trim() === cls
      );
      return {
        kelas: cls,
        studentCount: studentsInClass.length,
        filledGrades: gradesFilledCount,
        totalNeeded: totalGradesNeeded,
        percent,
        waliKelasName: waliKelas ? waliKelas.name : "Belum Ditugaskan",
      };
    });

    const studentRankings = students.map((s: any) => {
      const studentGrades = grades.filter((g: any) => matchesStudent(g, s));
      const subjectScores: Record<string, number> = {};
      let totalScore = 0;
      let filledSubjectsCount = 0;

      studentGrades.forEach((g: any) => {
        const val = Number(g.score);
        if (!isNaN(val) && g.score !== null && g.score !== undefined && g.subject) {
          subjectScores[g.subject] = val;
          totalScore += val;
          filledSubjectsCount++;
        }
      });

      const averageScore =
        filledSubjectsCount > 0
          ? Math.round((totalScore / filledSubjectsCount) * 10) / 10
          : 0;

      const predikat =
        filledSubjectsCount === 0
          ? "Belum Ada Nilai"
          : tentukanPredikatLabel(averageScore);

      return {
        studentId: s.id,
        name: s.name,
        nisn: s.nisn || s.nis,
        kelas: String(s.kelas || "").trim(),
        totalScore,
        averageScore,
        filledSubjectsCount,
        totalSubjectsCount: SUBJECTS_LIST.length,
        rank: 0,
        rankInClass: 0,
        predikat,
        subjectScores,
      };
    });

    studentRankings.sort((a: any, b: any) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    studentRankings.forEach((s: any, idx: number) => {
      s.rank = idx + 1;
    });

    const classCounters: Record<string, number> = {};
    studentRankings.forEach((s: any) => {
      const k = s.kelas;
      classCounters[k] = (classCounters[k] || 0) + 1;
      s.rankInClass = classCounters[k];
    });

    return {
      totalStudents,
      totalTeachers: teachers.length,
      subjectProgress,
      classProgress,
      studentRankings,
      lastUpdate: lastSyncAt || new Date().toISOString(),
    };
  }, [students, grades, teachers, lastSyncAt]);

  const noopRefresh = useCallback(() => {
    // Data is kept up-to-date in real time via Firestore onSnapshot
  }, []);

  return {
    summary,
    loading,
    error,
    connectionStatus,
    isOffline,
    refresh: noopRefresh,
  };
}

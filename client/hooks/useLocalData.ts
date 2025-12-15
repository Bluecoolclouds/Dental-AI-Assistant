import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import * as profileRepo from "@/storage/repositories/profileRepository";
import * as toothRepo from "@/storage/repositories/toothRepository";
import * as testRepo from "@/storage/repositories/testResultsRepository";
import * as alertsRepo from "@/storage/repositories/alertsRepository";
import * as historyRepo from "@/storage/repositories/toothHistoryRepository";
import * as filesRepo from "@/storage/repositories/toothFilesRepository";
import * as feedbackRepo from "@/storage/repositories/feedbackRepository";

export function useProfile() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<profileRepo.UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await profileRepo.getProfileByUserId(user.id);
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(async (updates: Partial<profileRepo.CreateProfileInput>) => {
    if (!user?.id) return;
    try {
      const updated = await profileRepo.updateProfile(user.id, updates);
      setProfile(updated);
      return updated;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }, [user?.id]);

  return { profile, isLoading, updateProfile, refetch: load };
}

const PROBLEM_LABELS: Record<string, string> = {
  cavity: "кариес",
  pain: "боль",
  crack: "трещина",
  sensitivity: "чувствительность",
  gum_issue: "проблемы с деснами",
  bleeding: "кровоточивость",
  chip: "скол",
  filling: "пломба",
};

const URGENT_PROBLEMS = ["cavity", "pain", "crack", "sensitivity", "gum_issue", "bleeding"];

export function useToothData() {
  const { user } = useAuthContext();
  const [toothData, setToothData] = useState<toothRepo.ToothData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await toothRepo.getAllTeeth(user.id);
      setToothData(data);
    } catch (error) {
      console.error("Error loading tooth data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTooth = useCallback(async (toothNumber: number, problems: string[], notes?: string) => {
    if (!user?.id) return;
    try {
      const existingTooth = toothData.find((t) => t.toothNumber === toothNumber);
      const existingProblems = existingTooth?.problems || [];
      
      const newProblems = problems.filter((p) => !existingProblems.includes(p));
      const urgentNewProblems = newProblems.filter((p) => URGENT_PROBLEMS.includes(p));

      await toothRepo.createOrUpdateTooth({
        userId: user.id,
        toothNumber,
        problems,
        notes,
      });

      if (urgentNewProblems.length > 0) {
        const problemNames = urgentNewProblems
          .map((p) => PROBLEM_LABELS[p] || p)
          .join(", ");
        
        await alertsRepo.createAlert({
          userId: user.id,
          type: "warning",
          title: `Зуб ${toothNumber}: требуется лечение`,
          description: `Обнаружено: ${problemNames}. Раннее лечение дешевле и проще! Не откладывайте визит к стоматологу — потом лечение будет дороже и сложнее, вплоть до удаления зуба.`,
          priority: "important",
          relatedTeeth: [toothNumber.toString()],
        });
      }

      await load();
    } catch (error) {
      console.error("Error saving tooth:", error);
      throw error;
    }
  }, [user?.id, load, toothData]);

  return { toothData, isLoading, saveTooth, refetch: load };
}

export function useTestResults() {
  const { user } = useAuthContext();
  const [testResults, setTestResults] = useState<testRepo.TestResult[]>([]);
  const [latestResult, setLatestResult] = useState<testRepo.TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const all = await testRepo.getAllTestResults(user.id);
      const latest = await testRepo.getLatestTestResult(user.id);
      setTestResults(all);
      setLatestResult(latest);
    } catch (error) {
      console.error("Error loading test results:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createTestResult = useCallback(async (input: Omit<testRepo.CreateTestResultInput, "userId">) => {
    if (!user?.id) return null;
    try {
      const result = await testRepo.createTestResult({ ...input, userId: user.id });
      await load();
      return result;
    } catch (error) {
      console.error("Error creating test result:", error);
      throw error;
    }
  }, [user?.id, load]);

  const updateAIRecommendations = useCallback(async (id: string, aiRecommendations: any) => {
    try {
      await testRepo.updateAIRecommendations(id, aiRecommendations);
      await load();
    } catch (error) {
      console.error("Error updating AI recommendations:", error);
      throw error;
    }
  }, [load]);

  return { testResults, latestResult, isLoading, createTestResult, updateAIRecommendations, refetch: load };
}

export function useAlerts() {
  const { user } = useAuthContext();
  const [alerts, setAlerts] = useState<alertsRepo.Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await alertsRepo.getActiveAlerts(user.id);
      setAlerts(data);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createAlert = useCallback(async (input: Omit<alertsRepo.CreateAlertInput, "userId">) => {
    if (!user?.id) return;
    try {
      await alertsRepo.createAlert({ ...input, userId: user.id });
      await load();
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  }, [user?.id, load]);

  const dismissAlert = useCallback(async (id: string) => {
    try {
      await alertsRepo.dismissAlert(id);
      await load();
    } catch (error) {
      console.error("Error dismissing alert:", error);
      throw error;
    }
  }, [load]);

  return { alerts, isLoading, createAlert, dismissAlert, refetch: load };
}

export function useToothHistory() {
  const { user } = useAuthContext();
  const [history, setHistory] = useState<historyRepo.ToothHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await historyRepo.getAllHistory(user.id);
      setHistory(data);
    } catch (error) {
      console.error("Error loading tooth history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createHistory = useCallback(async (input: Omit<historyRepo.CreateToothHistoryInput, "userId">) => {
    if (!user?.id) return null;
    try {
      const result = await historyRepo.createToothHistory({ ...input, userId: user.id });
      await load();
      return result;
    } catch (error) {
      console.error("Error creating tooth history:", error);
      throw error;
    }
  }, [user?.id, load]);

  const updateHistory = useCallback(async (id: string, updates: Partial<historyRepo.CreateToothHistoryInput>) => {
    try {
      await historyRepo.updateToothHistory(id, updates);
      await load();
    } catch (error) {
      console.error("Error updating tooth history:", error);
      throw error;
    }
  }, [load]);

  return { history, isLoading, createHistory, updateHistory, refetch: load };
}

export function useToothFiles() {
  const { user } = useAuthContext();
  const [files, setFiles] = useState<filesRepo.ToothFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await filesRepo.getAllToothFiles(user.id);
      setFiles(data);
    } catch (error) {
      console.error("Error loading tooth files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFile = useCallback(async (input: Omit<filesRepo.CreateToothFileInput, "userId">) => {
    if (!user?.id) return null;
    try {
      const result = await filesRepo.createToothFile({ ...input, userId: user.id });
      await load();
      return result;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }, [user?.id, load]);

  const deleteFile = useCallback(async (id: string) => {
    try {
      await filesRepo.deleteToothFile(id);
      await load();
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }, [load]);

  return { files, isLoading, uploadFile, deleteFile, refetch: load };
}

export function useFeedback() {
  const { user } = useAuthContext();

  const createFeedback = useCallback(async (category: string, message: string) => {
    try {
      return await feedbackRepo.createFeedback({
        userId: user?.id,
        category,
        message,
      });
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw error;
    }
  }, [user?.id]);

  return { createFeedback };
}

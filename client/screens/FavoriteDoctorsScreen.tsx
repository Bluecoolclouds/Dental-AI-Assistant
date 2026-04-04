import React, { useState, useCallback } from "react";
import {
  StyleSheet, View, TextInput, Pressable,
  ActivityIndicator, ScrollView, Alert, Modal, TouchableWithoutFeedback,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  getFavoriteDoctors,
  addFavoriteDoctor,
  deleteFavoriteDoctor,
  getDoctorsFromHistory,
  FavoriteDoctor,
  HistoryDoctor,
} from "@/storage/repositories/favoriteDoctorsRepository";

export default function FavoriteDoctorsScreen() {
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const [doctors, setDoctors] = useState<FavoriteDoctor[]>([]);
  const [historyDoctors, setHistoryDoctors] = useState<HistoryDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addingFromHistory, setAddingFromHistory] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [favorites, history] = await Promise.all([
        getFavoriteDoctors(user.id),
        getDoctorsFromHistory(user.id),
      ]);
      setDoctors(favorites);
      setHistoryDoctors(history);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const isAlreadyFavorite = (doctorNameVal: string) =>
    doctors.some((d) => d.doctorName.toLowerCase() === doctorNameVal.toLowerCase());

  const handleAddFromHistory = async (doctor: HistoryDoctor) => {
    if (!user?.id) return;
    setAddingFromHistory(doctor.doctorName);
    try {
      await addFavoriteDoctor({
        userId: user.id,
        doctorName: doctor.doctorName,
        clinicName: doctor.clinicName,
      });
      await loadAll();
    } catch {
      Alert.alert(t("common.error"), t("favoriteDoctors.saveFailed"));
    } finally {
      setAddingFromHistory(null);
    }
  };

  const handleAdd = async () => {
    if (!doctorName.trim()) {
      Alert.alert(t("common.error"), t("favoriteDoctors.emptyName"));
      return;
    }
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await addFavoriteDoctor({
        userId: user.id,
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
      });
      setDoctorName("");
      setClinicName("");
      setShowAddModal(false);
      await loadAll();
    } catch {
      Alert.alert(t("common.error"), t("favoriteDoctors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (doctor: FavoriteDoctor) => {
    Alert.alert(
      t("favoriteDoctors.deleteTitle"),
      t("favoriteDoctors.deleteConfirm", { name: doctor.doctorName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFavoriteDoctor(doctor.id);
              setDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
            } catch {
              Alert.alert(t("common.error"), t("favoriteDoctors.deleteFailed"));
            }
          },
        },
      ]
    );
  };

  const unaddedHistoryDoctors = historyDoctors.filter(
    (hd) => !isAlreadyFavorite(hd.doctorName)
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["2xl"] }} />
        ) : (
          <>
            {unaddedHistoryDoctors.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {t("favoriteDoctors.fromHistory")}
                </ThemedText>
                <View style={[styles.doctorsList, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  {unaddedHistoryDoctors.map((doctor, index) => (
                    <View
                      key={doctor.doctorName + "|" + doctor.clinicName}
                      style={[
                        styles.historyCard,
                        index < unaddedHistoryDoctors.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={[styles.doctorIcon, { backgroundColor: "#6B7280" + "15" }]}>
                        <AppIcon name="user" size={20} color="#6B7280" />
                      </View>
                      <View style={styles.doctorInfo}>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          {doctor.doctorName}
                        </ThemedText>
                        {doctor.clinicName ? (
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {doctor.clinicName}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => handleAddFromHistory(doctor)}
                        disabled={addingFromHistory === doctor.doctorName}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.addHistoryBtn,
                          { backgroundColor: "#EF4444" + "15", opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        {addingFromHistory === doctor.doctorName ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <AppIcon name="plus" size={18} color="#EF4444" />
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {doctors.length === 0 && unaddedHistoryDoctors.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
                  <AppIcon name="heart" size={32} color={theme.textSecondary} />
                </View>
                <ThemedText type="body" style={[styles.emptyTitle, { color: theme.text }]}>
                  {t("favoriteDoctors.emptyTitle")}
                </ThemedText>
                <ThemedText type="small" style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  {t("favoriteDoctors.emptyDesc")}
                </ThemedText>
              </View>
            ) : doctors.length > 0 ? (
              <View style={styles.section}>
                <View style={[styles.doctorsList, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  {doctors.map((doctor, index) => (
                    <View
                      key={doctor.id}
                      style={[
                        styles.historyCard,
                        index < doctors.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={[styles.doctorIcon, { backgroundColor: "#EF4444" + "15" }]}>
                        <AppIcon name="heart" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.doctorInfo}>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>
                          {doctor.doctorName}
                        </ThemedText>
                        {doctor.clinicName ? (
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {doctor.clinicName}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => handleDelete(doctor)}
                        hitSlop={8}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                      >
                        <AppIcon name="trash-2" size={18} color={theme.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={[styles.addButtonContainer, (doctors.length > 0 || unaddedHistoryDoctors.length > 0) && { marginTop: Spacing.xl }]}>
          <Button onPress={() => setShowAddModal(true)}>
            {t("favoriteDoctors.addDoctor")}
          </Button>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  {t("favoriteDoctors.addDoctor")}
                </ThemedText>

                <View style={[styles.inputRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="user" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder={t("favoriteDoctors.doctorNamePlaceholder")}
                    placeholderTextColor={theme.textSecondary}
                    value={doctorName}
                    onChangeText={setDoctorName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="map-pin" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder={t("favoriteDoctors.clinicNamePlaceholder")}
                    placeholderTextColor={theme.textSecondary}
                    value={clinicName}
                    onChangeText={setClinicName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => {
                      setDoctorName("");
                      setClinicName("");
                      setShowAddModal(false);
                    }}
                    style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  >
                    <ThemedText style={{ color: theme.textSecondary, fontWeight: "600" }}>
                      {t("common.cancel")}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleAdd}
                    disabled={isSaving}
                    style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                        {t("common.save")}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontWeight: "600",
    textAlign: "center",
  },
  emptyDesc: {
    textAlign: "center",
    lineHeight: 20,
  },
  doctorsList: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  doctorIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  addHistoryBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonContainer: {
    marginTop: Spacing["2xl"],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalSheet: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
});

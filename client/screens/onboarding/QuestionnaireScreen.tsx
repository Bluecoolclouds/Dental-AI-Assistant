import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useLocalData";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Questionnaire">;

const BRUSHING_OPTIONS = [
  { value: "once", label: "1 раз в день" },
  { value: "twice", label: "2 раза в день" },
  { value: "more", label: "Более 2 раз" },
];

export default function QuestionnaireScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { updateProfile } = useProfile();

  const [age, setAge] = useState("");
  const [brushingFrequency, setBrushingFrequency] = useState("");
  const [usesFloss, setUsesFloss] = useState(false);
  const [usesIrrigator, setUsesIrrigator] = useState(false);
  const [hasBraces, setHasBraces] = useState(false);
  const [hasSensitivity, setHasSensitivity] = useState(false);
  const [hasGumBleeding, setHasGumBleeding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        age: age ? parseInt(age) : undefined,
        brushingFrequency,
        usesFloss,
        usesIrrigator,
        hasBraces,
        hasSensitivity,
        hasGumBleeding,
      });
      navigation.navigate("ToothMapIntro");
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate("ToothMapIntro");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "60%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>3/5</ThemedText>
        </View>

        <ThemedText type="h3" style={styles.title}>
          Расскажите о себе
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Ответы помогут ИИ точнее оценить состояние полости рта
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Возраст</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            placeholder="Введите возраст"
            placeholderTextColor={theme.textSecondary}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Как часто чистите зубы?</ThemedText>
          <View style={styles.options}>
            {BRUSHING_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setBrushingFrequency(option.value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: brushingFrequency === option.value
                      ? theme.primary
                      : theme.backgroundDefault,
                    borderColor: brushingFrequency === option.value
                      ? theme.primary
                      : theme.border,
                  }
                ]}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: brushingFrequency === option.value ? "#FFFFFF" : theme.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Дополнительный уход</ThemedText>
          <View style={styles.checkboxes}>
            <CheckboxItem
              checked={usesFloss}
              onPress={() => setUsesFloss(!usesFloss)}
              label="Использую зубную нить"
            />
            <CheckboxItem
              checked={usesIrrigator}
              onPress={() => setUsesIrrigator(!usesIrrigator)}
              label="Использую ирригатор"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Особенности</ThemedText>
          <View style={styles.checkboxes}>
            <CheckboxItem
              checked={hasBraces}
              onPress={() => setHasBraces(!hasBraces)}
              label="Ношу брекеты/элайнеры"
            />
            <CheckboxItem
              checked={hasSensitivity}
              onPress={() => setHasSensitivity(!hasSensitivity)}
              label="Чувствительные зубы"
            />
            <CheckboxItem
              checked={hasGumBleeding}
              onPress={() => setHasGumBleeding(!hasGumBleeding)}
              label="Кровоточивость дёсен"
            />
          </View>
        </View>

        <View style={styles.buttons}>
          <Button onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : "Продолжить"}
          </Button>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="link">Пропустить</ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

function CheckboxItem({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.checkboxItem}>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? theme.primary : theme.backgroundDefault,
            borderColor: checked ? theme.primary : theme.border,
          }
        ]}
      >
        {checked ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
      </View>
      <ThemedText type="body">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing["2xl"],
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    borderWidth: 1,
  },
  checkboxes: {
    gap: Spacing.md,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: {
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  skipButton: {
    alignSelf: "center",
    padding: Spacing.md,
  },
});

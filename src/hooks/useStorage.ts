export function useStorage() {
  return {
    isPersistenceEnabled: false,
    note: "MVP state is in memory until AsyncStorage is added to the project dependencies.",
  };
}

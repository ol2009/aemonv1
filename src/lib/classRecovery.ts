import type { V2State } from '../state/V2Store'
import type { RemoteClassSummary } from './v2Remote'

export function localClassHasSharedData(state: Pick<V2State, 'nameCandidates' | 'wishes' | 'surveyResponses' | 'proposals' | 'adoptedCodes' | 'chatLogs'>) {
  return (
    state.nameCandidates.length > 0 ||
    state.wishes.length > 0 ||
    state.surveyResponses.length > 0 ||
    state.proposals.length > 0 ||
    state.adoptedCodes.length > 0 ||
    state.chatLogs.length > 0
  )
}

export function localClassLooksEmpty(state: V2State) {
  return !localClassHasSharedData(state) && state.currentLesson <= 1
}

export function remoteClassHasSharedData(remoteClass: RemoteClassSummary) {
  return remoteClass.activityCount > 0 || remoteClass.currentLesson > 1
}

export function findBestRecoverableClass(classes: RemoteClassSummary[]) {
  return classes.find(remoteClassHasSharedData) ?? classes[0] ?? null
}

export function shouldAutoRestoreClass(state: V2State, classes: RemoteClassSummary[]) {
  const bestClass = findBestRecoverableClass(classes)
  if (!bestClass || bestClass.classCode === state.classCode) return false

  if (!state.classCode) return remoteClassHasSharedData(bestClass)

  const currentClassBelongsToTeacher = classes.some((remoteClass) => remoteClass.classCode === state.classCode)
  if (currentClassBelongsToTeacher) return false

  return localClassLooksEmpty(state) && remoteClassHasSharedData(bestClass)
}

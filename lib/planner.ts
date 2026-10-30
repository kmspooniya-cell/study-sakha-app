import { TODAY_PLAN } from './data';
import type { PlannerTask, State } from './store';

export type PlannerTaskView = {
  id: string;
  label: string;
  category: string;
  minutes: number;
  taskType: PlannerTask['taskType'];
  priority: PlannerTask['priority'];
  completed: boolean;
  completedOn: string | null;
  targetDate: string;
  actualStudySeconds: number;
  isDefault: boolean;
  kind: string;
  refId: string;
};

export type PlannerTaskEdit = Pick<
  PlannerTask,
  'label' | 'minutes' | 'category' | 'taskType' | 'priority' | 'targetDate' | 'scope' | 'periodKey'
>;

/**
 * Applies an edit to an existing custom planner task without changing its ID
 * or any supporting data stored outside the task record, such as accumulated
 * focus seconds.
 */
export function updatePlannerTask(task: PlannerTask, edit: Partial<PlannerTaskEdit>): PlannerTask {
  const nextTargetDate = edit.targetDate ?? task.targetDate;
  const nextScope = edit.scope ?? task.scope;
  const sameDate = nextTargetDate === task.targetDate;
  const nextPeriodKey = edit.periodKey ?? (
    nextScope === 'daily' ? nextTargetDate : task.periodKey
  );

  return {
    ...task,
    ...edit,
    targetDate: nextTargetDate,
    scope: nextScope,
    periodKey: nextPeriodKey,
    completed: sameDate ? task.completedOn === nextTargetDate : false,
    completedOn: sameDate ? task.completedOn : null,
  };
}

function defaultCategory(kind: string) {
  if (kind === 'pyq') return 'Polity';
  if (kind === 'ca') return 'Current Affairs';
  if (kind === 'test') return 'Mock Test';
  return 'Polity';
}

function defaultTaskType(kind: string): PlannerTask['taskType'] {
  if (kind === 'pyq') return 'PYQ';
  if (kind === 'ca') return 'Current Affairs';
  if (kind === 'test') return 'Test';
  return 'Revision';
}

/**
 * Returns the visible daily planner tasks for a date.
 *
 * Built-in task IDs and custom task IDs are preserved. Built-in overrides,
 * deleted defaults, completion state, and accumulated focus time are resolved
 * from the existing store fields without mutating them.
 */
export function getPlannerTasksForDate(state: State, date: string): PlannerTaskView[] {
  const completedDefaults = new Set(state.planDone[date] ?? []);

  const defaults: PlannerTaskView[] = TODAY_PLAN
    .filter((task) => task.id !== 'tp4')
    .filter((task) => !state.plannerDeletedDefaults.includes(task.id))
    .map((task) => {
      const override = state.plannerDefaultOverrides[task.id];
      const completed = completedDefaults.has(task.id);
      return {
        id: task.id,
        label: override?.label ?? task.label,
        category: override?.category ?? defaultCategory(task.kind),
        minutes: override?.minutes ?? task.minutes,
        taskType: override?.taskType ?? defaultTaskType(task.kind),
        priority: override?.priority ?? 'Medium',
        completed,
        completedOn: completed ? date : null,
        targetDate: date,
        actualStudySeconds: state.plannerTaskStudySeconds[task.id] ?? 0,
        isDefault: true,
        kind: task.kind,
        refId: task.refId,
      };
    });

  const customTasks: PlannerTaskView[] = state.plannerTasks
    .filter((task) => task.scope === 'daily' && task.targetDate === date)
    .map((task) => ({
      id: task.id,
      label: task.label,
      category: task.category,
      minutes: task.minutes,
      taskType: task.taskType,
      priority: task.priority,
      completed: task.completedOn === date,
      completedOn: task.completedOn,
      targetDate: task.targetDate,
      actualStudySeconds: state.plannerTaskStudySeconds[task.id] ?? 0,
      isDefault: false,
      kind: 'custom',
      refId: task.id,
    }));

  return [...defaults, ...customTasks];
}

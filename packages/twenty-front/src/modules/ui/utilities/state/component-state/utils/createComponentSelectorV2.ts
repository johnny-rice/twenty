import { selectorFamily } from 'recoil';

import { ComponentInstanceStateContext } from '@/ui/utilities/state/component-state/types/ComponentInstanceStateContext';
import { ComponentReadOnlySelectorV2 } from '@/ui/utilities/state/component-state/types/ComponentReadOnlySelectorV2';
import { ComponentSelectorV2 } from '@/ui/utilities/state/component-state/types/ComponentSelectorV2';
import { ComponentStateKeyV2 } from '@/ui/utilities/state/component-state/types/ComponentStateKeyV2';
import { globalComponentInstanceContextMap } from '@/ui/utilities/state/component-state/utils/globalComponentInstanceContextMap';
import { SelectorGetter } from '@/ui/utilities/state/types/SelectorGetter';
import { SelectorSetter } from '@/ui/utilities/state/types/SelectorSetter';
import { isDefined } from 'twenty-ui';

export const createComponentSelectorV2 = <ValueType>({
  key,
  get,
  set,
  instanceContext,
}: {
  key: string;
  get: SelectorGetter<ValueType, ComponentStateKeyV2>;
  set?: SelectorSetter<ValueType, ComponentStateKeyV2>;
  instanceContext: ComponentInstanceStateContext<any> | null;
}): ComponentSelectorV2<ValueType> | ComponentReadOnlySelectorV2<ValueType> => {
  if (isDefined(instanceContext)) {
    globalComponentInstanceContextMap.set(key, instanceContext);
  }

  if (isDefined(set)) {
    return {
      type: 'ComponentSelector',
      key,
      selectorFamily: selectorFamily<ValueType, ComponentStateKeyV2>({
        key,
        get,
        set,
      }),
    } satisfies ComponentSelectorV2<ValueType>;
  } else {
    return {
      type: 'ComponentReadOnlySelector',
      key,
      selectorFamily: selectorFamily<ValueType, ComponentStateKeyV2>({
        key,
        get,
      }),
    } satisfies ComponentReadOnlySelectorV2<ValueType>;
  }
};
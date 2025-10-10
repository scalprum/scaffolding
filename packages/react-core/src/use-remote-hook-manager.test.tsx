import React from 'react';
import { renderHook } from '@testing-library/react';
import { RemoteHookProvider } from './remote-hook-provider';
import { useRemoteHookManager } from './use-remote-hook-manager';

// Mock getModule from @scalprum/core to resolve to a test hook
jest.mock('@scalprum/core', () => ({
  getModule: jest.fn(),
}));

// Crypto.randomUUID is used by provider; provide a stable mock
beforeAll(() => {
  global.crypto = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getRandomValues: () => new Uint8Array(0),
    randomUUID: (() => {
      let counter = 0;
      return () => `mock-id-${++counter}`;
    })(),
  } as unknown as Crypto;
});

describe('useRemoteHookManager', () => {
  const { getModule } = jest.requireMock('@scalprum/core') as { getModule: jest.Mock };

  function wrapper({ children }: { children: React.ReactNode }) {
    return <RemoteHookProvider>{children}</RemoteHookProvider>;
  }

  test('loads hook and exposes hookResults; updateArgs propagates to hook', async () => {
    const hookImpl = jest.fn((value: number) => value * 2);
    getModule.mockResolvedValue(hookImpl);

    const { result } = renderHook(() => useRemoteHookManager<number>(), { wrapper });

    // Add a new hook
    await React.act(async () => {
      result.current.addHook({ scope: 's', module: 'm', importName: 'default', args: [2] });
      await Promise.resolve();
    });

    // After load, the provider executes hookImpl; first render computes 4
    expect(result.current.hookResults).toHaveLength(1);
    expect(result.current.hookResults[0].loading).toBe(false);
    expect(result.current.hookResults[0].error).toBeNull();

    // The hook result is produced via provider and stored in context state
    // Wait a tick to ensure HookExecutor effect commits state
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hookResults[0].hookResult).toBe(4);

    // Update args via handle.updateArgs and expect new computation
    await React.act(async () => {
      const handle = result.current.addHook({ scope: 's', module: 'm', importName: 'default', args: [3] });
      await Promise.resolve();
      handle.updateArgs([5]);
      await Promise.resolve();
    });

    // There are now two hooks; latest should compute 10
    expect(result.current.hookResults).toHaveLength(2);
    expect(result.current.hookResults[1].hookResult).toBe(10);

    // Ensure hook function calls reflect latest args
    expect(hookImpl).toHaveBeenCalledWith(2);
    expect(hookImpl).toHaveBeenCalledWith(2);
    expect(hookImpl).toHaveBeenCalledWith(5);
  });

  test('sets error on getModule rejection', async () => {
    getModule.mockRejectedValueOnce(new Error('load failed'));

    const { result } = renderHook(() => useRemoteHookManager(), { wrapper });

    await React.act(async () => {
      result.current.addHook({ scope: 's', module: 'm' });
      await Promise.resolve();
    });

    // Wait a tick for error state update
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hookResults).toHaveLength(1);
    expect(result.current.hookResults[0].loading).toBe(false);
    expect(result.current.hookResults[0].error).toBeInstanceOf(Error);
  });

  test('hookResults maintains referential equality across noop rerenders and changes when hooks update', async () => {
    const hookImpl = jest.fn(() => 'value');
    getModule.mockResolvedValue(hookImpl);

    const { result, rerender } = renderHook(() => useRemoteHookManager(), { wrapper });

    // Initial add -> one hook
    await React.act(async () => {
      result.current.addHook({ scope: 's', module: 'm' });
      await Promise.resolve();
    });

    // Wait a tick for state propagation
    await React.act(async () => {
      await Promise.resolve();
    });

    const firstRef = result.current.hookResults;
    expect(Array.isArray(firstRef)).toBe(true);

    // No changes, rerender the hook -> should preserve reference
    rerender();
    const secondRef = result.current.hookResults;
    expect(secondRef).toBe(firstRef);

    // Now add another hook -> hookResults should be a new array (change in subscriptions)
    await React.act(async () => {
      result.current.addHook({ scope: 's', module: 'm2' });
      await Promise.resolve();
    });

    const thirdRef = result.current.hookResults;
    expect(thirdRef).not.toBe(firstRef);
    expect(thirdRef.length).toBe(2);
  });

  test('hookResults changes when existing hook updates its value asynchronously', async () => {
    // Remote hook that changes its return value after a timeout
    const asyncUpdatingHook = () => {
      const [value, setValue] = React.useState(1);
      React.useEffect(() => {
        const id = setTimeout(() => setValue(2), 0);
        return () => clearTimeout(id);
      }, []);
      return value;
    };
    getModule.mockResolvedValue(asyncUpdatingHook);

    jest.useFakeTimers();

    const { result } = renderHook(() => useRemoteHookManager<number>(), { wrapper });

    await React.act(async () => {
      result.current.addHook({ scope: 's', module: 'm' });
      await Promise.resolve();
    });

    // Wait one tick to capture initial value
    await React.act(async () => {
      await Promise.resolve();
    });

    const initialRef = result.current.hookResults;
    expect(initialRef).toHaveLength(1);
    expect(initialRef[0].hookResult).toBe(1);

    // Advance timers so the hook updates its internal state and re-renders
    await React.act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    const updatedRef = result.current.hookResults;
    expect(updatedRef).not.toBe(initialRef);
    expect(updatedRef).toHaveLength(1);
    expect(updatedRef[0].hookResult).toBe(2);

    jest.useRealTimers();
  });
});

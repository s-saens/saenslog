---
title: '2D LookAt Lerp'
date: 2023-04-26 15:25
tistory: https://saens.tistory.com/26
---

Transform에는 특정 target을 바라보도록 하는 함수인 **LookAt**이 기본적으로 내장되어 있습니다. 그런데 이 함수는 한 프레임 만에 회전값을 변경시킵니다. 2D에서는 다음과 같이 간단하게 수식 하나로, 바라보는 방향 벡터의 x축을 기준으로 하는 각도(θ)값을 얻고 이를 통해 Quaternion.Lerp를 활용하여 **부드럽게 회전**시킬 수 있습니다.

바로 코드부터 봅시다.

```csharp
public static class LookAtExtension
{
    public static void LookAt2DLerp(this Transform transform, Vector2 dir, float lerpPercent = 0.05f)
    {
        float rotationZ = Mathf.Acos(dir.x / dir.magnitude)
            * 180 / Mathf.PI
            * Mathf.Sign(dir.y);

        transform.rotation = Quaternion.Lerp(
            transform.rotation,
            Quaternion.Euler(0,0,rotationZ),
            lerpPercent
        );
    }
}
```

위와 같이 확장메서드를 작성하면 다음과 같은 방식으로 어떤 MonoBehaviour 오브젝트가 특정 트랜스폼을 바라보게 할 수 있습니다.

```csharp
Transform target;

void Update()
{
 Vector2 dir = target.position - this.transform.position;
 this.transform.LookAtLerp(dir);
}
```

코드는 sprite가 xy평면 상에서 움직인다는 가정 하에 작성되었으며, 기본적으로 0º일 때 <1, 0> 방향을 바라보고 있습니다. 식을 도출한 과정은 다음과 같습니다.

v1 = x축 방향 단위 벡터 = <1, 0>
v2 = 바라보는 방향 벡터 dir = <x, y> 라고 합시다.

두 벡터의 내적 v1•v2 = |v1| _|v2|_ cosθ
= <1, 0>•<x, y> = 1*x + 0*y = x,
|v1| = 1이므로, x = |v2| \* cosθ
→ cosθ = x / |v2|
∴**θ = acos(x / |v2|)** = rotationZ

→ 라디안 값을 0~360 범위로 바꾸기 위해 **(180 / pi) 를 곱**하고, y가 음수이면 세타값도 음수로 바꾸어야 하므로 **Sign(y)를 곱**합니다.
(Sign은 삼각함수인 사인(sin) 함수가 아니라, 음수면 -1, 양수면 1을 반환하는 함수입니다.)

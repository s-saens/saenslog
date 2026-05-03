---
title: 'AR Tracking Correction'
date: 2021-01-28 20:38
tistory: https://saens.tistory.com/9
---

이 글에서는 AR 트래킹이 튀어서 오브젝트들이 지맘대로 순간이동하는 괴현상을 고치는 것에 대해 얘기할 것입니다.

해커톤에서 재난대피훈련 AR 앱을 만들 때였습니다.

분명 이론적으로는 완벽한(적어도 제 기준에서는) 로직으로 코드를 짰는데, 자꾸 AR Camera 오브젝트의 position 값이 말도 안되는 값으로 변경되는 괴현상이 발생했습니다.

## 1. Handling position

일단
**AR 카메라(플레이어)의 위치**
를 다루는 법에 대해서 알아봅시다.

1. AR Session Origin
    : AR 세계의 원점. AR 카메라 오브젝트는 이 오브젝트에 귀속되므로 이 오브젝트의 Transform은 자식 오브젝트인 AR 카메라 오브젝트의 Transform에 영향을 준다.

(AR Session과는 다릅니다. AR Session은 Game Manager 같은 느낌으로 즉 AR Session이 active 상태로 있으면 그 Scene이 AR 시스템에 의해 관리된다는 것을 명시해주는 역할을 합니다. 즉 Transform이 의미가 없습니다.)

1. AR Camera
    : AR
   카메라 오브젝트의 position은 카메라에 비치는 이미지 자체 또는 센서를 통해 얻는 Depth 이미지 처리에 의해서만 결정됩니다.
   스크립트에서 아무리 수정해도 그 사항이 적용되지 않기 때문에, 만약 카메라의 position을 변경해주고싶다면 부모 오브젝트인 AR Session Origin을 바꿔줌으로써 간접적으로 변경해주어야 합니다.

만약 아래와 같이, 오브젝트는 그대로 두고 플레이어의 위치가 변하길 원하는데, (-1,2)에서 (1,1)으로 움직여주고 싶다면, 그 차이만큼 카메라가 아닌 AR Session Origin을 움직여줘야 하는 것입니다. 즉, (나중위치벡터 - 원래위치벡터)의 벡터를 AR Session Origin에 더해주면 됩니다. 로테이션도 비슷한 원리로 수정해줄 수 있습니다. (하지만 조금 주의해야 할 점이 있는데, 아래에서 다루겠습니다.)

![](/blog/Dev/Unity/t9/01_img.png)

_그림이 미묘하게 틀어져있는 것 같긴 한데 그냥 넘어갑시다._

## 2. 트래킹이 왜 튀는가?

모든 로직을 나름 잘 구현했다고 생각했고, 집에서 테스트 했을 때는 오류 없이 잘 됐었는데, 조금이라도 더 큰 공간에서 테스트하니 미친듯이 트래킹이 튀었습니다. 당장 제 자취방 앞 복도에서도 말이죠.

![](/blog/Dev/Unity/t9/02_img.gif)

_오잉 체크포인트 어디갔니..?_

그나마 다행인 점은 트래킹이 튈때 항상 rotation의 경우에는 y성분만 튀었다는 것입니다.

그리고 학교 건물에서 훈련 생성 Scene을 테스트할 때에는, 4층→3층의 계단
(3.5층)
은 잘 되다가 3층→2층(2.5층)에서 다른 오브젝트들이 한 층 만큼 내려와서, 결과적으로 아까 3.5층에서의 상태가 되었습니다. 몇 번을 재시도 해봐도 변함없이 2.5층 구간에서 계속 트래킹이 튀었습니다. (그 때 고생한 저+팀원들 생각에 눈물이...)

![](/blog/Dev/Unity/t9/03_img.png)

_화나고 지쳐서 영상 기록조차 남겨놓지 않았습니다... 그림판으로 만족해주세요_

이 괴현상을 보면서 추측한 원인은 다음과 같습니다.

- AR은 여러 프레임의 Raw 이미지들 또는 센서를 통해서 얻은 Depth 이미지들을 처리하여 이동 거리를 계산한다.
    (그렇기 때문에 카메라/센서를 가린 채로 움직이면 위치가 변하지 않는 것을 확인할 수 있습니다.)
- 3.5층을 지나며 메모리에 저장해놨던 이미지와 똑같은 이미지가 2.5층에서 등장했다.
- 결론 : 두 이미지가 같은 장소라고 판단한 시스템이 카메라를 지맘대로 옮겨버린 것.

##

## 3. Correction

대부분의 트래킹 튐 현상을 보면, 단 한 프레임 만에 AR 카메라 오브젝트의 위치가 너무 크게 바뀌고, rotation 값도 부자연스럽게 변합니다. 60FPS 기준 1미터만 튀어도 초속 60미터라는 속도가 나옵니다. 우사인볼트가 아무리 빨리 달린대도 불가능한 일이죠.

이렇게 position(또는 rotation) 값에 말도안되는 변화가 발생했을 경우 트래킹이 튀었다고 간주하여 **1. Handling Position**에서 살펴봤던 방식으로 position을 조정하면 고칠 수 있습니다.

1. 매 프레임마다 position과 rotation의 변화량을 계산.
2. 만약 그 값이 크면(기준 : sensitivity) 그 변화량 만큼 AR Session Origin을 이동/회전(y)시킨다.

```csharp
private void TrackingCorrection(float sensitivity)
{
    // rotation - y축만 고려
    rot_now = arCam.transform.rotation.eulerAngles.y;
    float rot_dif = rot_now - rot_last;
    if (Mathf.Abs(rot_dif) > 90*sensitivity && Mathf.Abs(rot_dif) < 270*sensitivity)
    {
        arSession_Origin.transform.Rotate(0, -rot_dif, 0);
    }
    //

    // position
    pos_now = arCam.transform.position;
    Vector3 pos_dif = pos_now - pos_last;
    if (pos_dif.magnitude > sensitivity)
    {
        Debug.Log(pos_dif.magnitude);
        arSession_Origin.transform.position -= pos_dif;
    }

    pos_last = arCam.transform.position;
    rot_last = arCam.transform.rotation.eulerAngles.y;
}
```

여기서 주의할 점은
**회전부터**
해줘야 한다는 것입니다!

![](/blog/Dev/Unity/t9/04_img.png)

그림에서와 같이 부모(노랑, ARSessionOrigin) 오브젝트를 회전하면 자식(빨강, AR Camera)과의 거리가 0이 아닌 이상 반드시 자식오브젝트의 position에도 영향을 주기 때문입니다. 다시 말하자면, 부모의 **회전**은 자식의 **위치**에 영향을 줍니다. 그래서 만약 Translate먼저 하셨다면, Rotate 후에 또 이동된 만큼의 벡터를 고려해서 Translate 해줘야 합니다. 그래서 Translate - Rotate - Translate 할 바에 그냥 Rotate - Translate 하라는 얘기입니다.

이렇게 하면 트래킹 문제가 완벽하게는 해결되지 않지만 어느 정도는 해결되며, 저 "계단문제"는 확실히 해결됩니다.

## 4. AR 트래킹의 불안정성을 고치기 위한 생각

이동을 할 때 AR Session Origin 자체가 변경되지 않는 이상, AR Camera의 움직임이 핸드폰에 내장된 가속센서에 종속되도록 하고 이미지 프로세싱을 통해 보정을 하는 식으로 하면 더욱 안정적인 트래킹이 가능하지 않을까 하는 생각이 듭니다. 물론 제가 모르는 어떤 제약사항이 있기 때문에 이런식으로 구현되지 않았으리라 생각합니다. 뛰어난 석학 분들의 오랜 연구를 통해 만들어진 것일 테니까요.

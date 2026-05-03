---
title: '멀티플랫폼 터치를 통한 3인칭 이동/카메라회전'
date: 2020-12-16 01:44
tistory: https://saens.tistory.com/5
---

여러 플랫폼에서 동시에 쓰일 수 있는 터치/클릭/드래그 를 통한 이동 및 회전에 대해 다루려 합니다.

옛날에 제가 이벤트, 인터페이스 등의 개념을 몰랐을 때는, 그리고 구글링을 더 못했던 시절에는 플랫폼에 종속되는 코드를 짰었습니다. 그래서 안드로이드 터치를 테스트하기 위해서는 반드시 빌드를 하는 번거로움이 있었죠. 하지만 멀티플랫폼에 대응되도록 유니티에서 지원해주는 기능을 이용하면 그런 번거로움을 해소할 수 있습니다.

이 글에는 어떤 코드를 짤 때, 제가 어떤 생각을 했는지, 어떤 식으로 코드를 구성했는지 등에 대한 이야기도 자세하게 적어 놓았습니다. 욕 할 만한 부분이 있다면 제 성장을 위해 가차없이 욕해주시길 바랍니다.

## 0. 결과물

![](/blog/Dev/Unity/t5/01_img.gif)

작업결과부터 보여주자면, 이런걸 만들어볼 생각입니다. 모두 기초적인 개념으로만 설명하고 있지만, 처음 보는 사람들이라면 힘든 부분이 많을 것입니다. 처음 보는 사람이 아니더라도 꽤나 복잡한 부분도 있습니다. 코드를 한 자 한 자 정성스럽게 보고, 자기 입맛대로 수정해보면서 여러 에러를 만나거나 또는 성공하는 경험을 해보기 바랍니다.

## 1. Joystick 이동

먼저 에셋스토어에서 유명한 Joystick 에셋을 불러옵시다. 스크립트가 깔끔하게 정리되어있고 추상화도 잘 되어있어 사용하기에 아주 편합니다. 시간 날 때 코드를 한 번 들여다보면서 이 개발자가 어떤 생각으로 이렇게 만들었는지 고민해 봅시다. 각 소스파일의 위치, 폴더 배치, 코드 내에서 상속, 네이밍 등을 잘 참고해 보세요. 괜히 별이 다섯 개가 아닙니다. (장수돌침대!)

[https://assetstore.unity.com/packages/tools/input-management/joystick-pack-107631](https://assetstore.unity.com/packages/tools/input-management/joystick-pack-107631)

[Joystick Pack | 입출력 관리 | Unity Asset Store

Get the Joystick Pack package from Fenerax Studios and speed up your game development process. Find this & other 입출력 관리 options on the Unity Asset Store.

assetstore.unity.com](<https://assetstore.unity.com/packages/tools/input-management/joystick-pack-107631>)

에셋을 불러오는 것은 다들 알 것이라 가정하고 대충 글로만 설명하고 넘어가겠습니다.

- Unity 계정 로그인 후 브라우저로 에셋스토어 접속
- 내 에셋에 추가
- 유니티에서 에셋스토어 접속하고, My Assets 들어가서 Download 하고, Import

![](/blog/Dev/Unity/t5/02_img.png)

_일단 씬을 이렇게 구성했다._

바닥 위에 있는 작은 육면체를 조이스틱을 통해 움직이려 합니다.

먼저 UI 캔버스를 추가해주고 **캔버스 스케일러**를 적절히 조절해 줍시다. 디바이스 크기 변화에 대응하기 위해서입니다.

![](/blog/Dev/Unity/t5/03_img.png)

_Canvas Scaler를 대충 이렇게 해준다._

캔버스에다가 조이스틱 아무거나 넣어 줍시다.

![](/blog/Dev/Unity/t5/04_img.png)

_나는 Dynamic으로 했다._

먼저 Joystick이 입력을 어떻게 받는지 확인해 봅시다.

![](/blog/Dev/Unity/t5/05_img.png)

_Joystick Pack / Scripts / Base / Joystick.cs_

Joystick 클래스의 필드를 보면
가로 세로 각각을 float타입으로 얻을 수 있고,
그 둘을 합친 Vector2타입의 방향을 얻을 수 있습니다.

조이스틱 포인터의 위치에 따른 Direction(Horizontal, Vertical) 은 다음과 같습니다.

![](/blog/Dev/Unity/t5/06_img.png)

오브젝트가 조이스틱에 의해 **XZ평면**
상에서만
움직이는 걸 만들려 합니다.

여기서 직관적으로 생각해보기에 (0, 1)일 때 앞, (-1, 0)일 때 왼쪽, 이런 식으로 움직이면 적당할 듯 합니다.

즉, 움직여야 할 오브젝트의 앞을 향하는 벡터(로컬좌표계에서 Vector3.forward) 에다가 Joystcik의 Vertical 값을 곱해주고, 오른쪽을 향하는 벡터에다가 Horizontal 값을 곱해주면 되겠습니다.

오브젝트.transform.Translate( 로컬좌표계 방향 ) 을 이용해서 오브젝트를 움직일 수 있는데, 이 방향을 다음과 같이 쓸 수 있습니다.

new Vector3(controller.Vertical, 0, controller.Horizontal)

이제 스크립트를 만들어 봅시다. 이 때 누구 관점에서 조이스틱으로 오브젝트를 컨트롤할 건지 생각해 봅시다.

1. 오브젝트에서 조이스틱을 받아와서 스스로를 움직이기.
2. 조이스틱에서 오브젝트를 받아와서 움직이기.
3. 제 3의 오브젝트에서 이 둘을 받아와서 움직이기.

어떻게 해도 크게 상관은 없지만, 저는 2번으로 해주겠습니다.

```csharp
using UnityEngine;

public class MoveObject : MonoBehaviour
{
    public Transform moving_object;
    public float speed = 20f;

    private Joystick controller;

    private void Strat() {
        controller = this.GetComponent<Joystick>();
    }

    private void FixedUpdate()
    {
 // 2021.09.23, this ▹ controller로 수정. Hoon 님 댓글 감사합니다.
        Vector3 moveDir = new Vector3(controller.Vertical, 0, controller.Horizontal);
        moving_object.Translate(moveDir * Time.fixedDeltaTime * speed);
    }
}
```

이렇게 스크립트를 짰으면, DynamicJoystick 오브젝트에 넣어주고, Hierarchy 탭에서 알맞은 오브젝트들을 잘 끌어다 넣어줍시다. 이렇게 하니 잘 움직이는 걸 볼 수 있지만, 말 그대로 움직이기만 합니다.

![](/blog/Dev/Unity/t5/07_img.gif)

오브젝트가 움직이기만 할 게 아니라, 움직이는 방향으로 오브젝트가 회전하면 좋을 것 같습니다. moving_object를 Translate 하기 전에, 오브젝트의 로테이션을 moveDir에 맞게 먼저 바꿔준 뒤, **forward**로 가주면 됩니다. 이 때 **방향벡터에 맞는 Quaternion**을 반환해주는 정적 메서드 **LookRotation(Vector3)**를 이용해 줍니다. 그러면 코드는 다음과 같아집니다.

```csharp
private void FixedUpdate()
    {
        Vector3 moveDir = new Vector3(controller.Vertical, 0, controller.Horizontal);

        if(moveDir == Vector3.zero) return;
        moving_object.rotation = Quaternion.LookRotation(moveDir);
        moving_object.Translate(Vector3.forward * Time.fixedDeltaTime * speed);
    }
```

if(~) return을 해준 이유는, 조이스틱 포인터가 가운데에 있을 때에도 (즉, 움직이지 말아야 할 때도) Translate 메서드가 실행되어서 가만히 놔둬도 막 가버리기 때문입니다. 어쨌든 이렇게 해주면 다음과 같이 의도대로 잘 움직여 줍니다.

![](/blog/Dev/Unity/t5/08_img.gif)

전체 코드는 다음과 같습니다. moveDir를 한줄에 쓰니 너무 길어서 두 줄로 나눠 주었습니다.

```csharp
using UnityEngine;

public class MoveObject : MonoBehaviour
{
    public Transform moving_object;
    public float speed = 20f;

    private Joystick controller;
    private void Start() {
        controller = this.GetComponent<Joystick>();
    }

    private void FixedUpdate()
    {
        Vector3 moveDir = new Vector3(controller.Vertical, 0 ,controller.Horizontal);

        if(moveDir == Vector3.zero) return;

        moving_object.rotation = Quaternion.LookRotation(moveDir);
        moving_object.Translate(Vector3.forward * Time.fixedDeltaTime * speed);
    }
}
```

## 2. 오브젝트를 따라가는 카메라

이제 카메라가 이 오브젝트를 따라가도록 해보겠습니다. 위의 방법을 써서 움직임을 구현하면 움직일 때마다 오브젝트의 rotation이 변경되기 때문에, 저 오브젝트의 자식으로 Camera를 배치해서 구현하려 하면 아주 재밌어질(...) 것입니다.

카메라가 오브젝트를 따라가는 걸 구현하는 것은 다음과 같습니다.

1. 빈 오브젝트(Empty)를 만들고, CamPivot이라고 명명.
2. CamPivot이 항상 오브젝트의 위치와 같도록 스크립트를 짜기 (Lerp를 이용하여 부드럽게 이동하도록 합니다.)
3. CamPivot의 자식으로 Camera를 배치.

CamPivot이 움직이는 오브젝트와 위치는 같지만, rotation이 서로 독립적이어서, 오브젝트의 rotation에 구애받지 않고 카메라가 잘 따라가게 할 수 있으며, Lerp를 이용해서 부드러운 카메라 이동을 구현할 수 있고, 나중에 카메라 회전을 구현할 때도 용이합니다.

위의 순서대로 만들어 줍시다. 이 때 Vector3 클래스에 있는 Lerp(선형보간) 메서드를 이용할 건데, 자세한 건 구글링 해보시길 바라요. 간단히 말하면 시작점, 끝점, 걸리는 시간 의 세 개의 파라미터를 통해서 Update 호출시 마다, 전에 호출되었을 때의 값, 나중에 호출될 때의 값을 통해 부드럽게 그 값을 변경하는 메서드입니다. 이는 Vector3 뿐만 아니라 Quaternion, Vector2, float(Mathf)의 클래스에서도 정의되어 있습니다.

Vector3.Lerp( 시작점, 끝점, 걸리는시간(0에서1) ) 의 형태로 사용합니다.

```csharp
using UnityEngine;

public class CamPivotFollowsObject : MonoBehaviour
{
    public Transform following_object;

    private void FixedUpdate()
    {
        Vector3 pos = this.transform.position;
        this.transform.position = Vector3.Lerp(pos, following_object.position, 0.4f);
    }
}
```

![](/blog/Dev/Unity/t5/09_img.png)

![](/blog/Dev/Unity/t5/10_img.png)

CamPivot 오브젝트에 스크립트를 넣어주고, 이렇게 저렇게 잘 해주면 다음과 같이 카메라가 잘 따라가줍니다. 걸리는 시간을 더 0에 가깝게 맞춰주면 더 느리고 부드럽게 카메라가 이동할 것입니다.

![](/blog/Dev/Unity/t5/11_img.gif)

## 3. 터치&드래그로 화면 회전

이제 카메라를 조이스틱처럼 터치를 통해 회전시키는 걸 구현해 봅시다.

![](/blog/Dev/Unity/t5/12_img.png)

파란 부분을 터치했을 때는 조이스틱이 떠서 오브젝트를 움직이고, 노란 부분을 터치했을 때는 카메라를 회전시키려 합니다. 다음과 같이 캔버스에**Cam Rotator** 라는 오브젝트를 추가해주고, 화면을 꽉 채우게 해줍시다. 이 때, Hierarchy 탭에서 **같은 계층**에 있는 오브젝트 사이에서는 **아래에 있는 오브젝트가 더 큰 우선순위**를 가지므로, 캔버스 내에서 조이스틱보다 Rotator를 위에다가 배치해 줍니다. 조이스틱 크기도 적절히 조절해 줍시다. 저는 조이스틱이 왼쪽 아래 4분의 1만 차지하도록 했습니다.

![](/blog/Dev/Unity/t5/13_img.png)

_화면 크기가 1600, 1000 이므로 4분의 1이면 800, 500_

Cam Rotator 에다가 넣을 스크립트를 만들어 줍시다. 이 때 Joystick.cs에서 사용된 여러 이벤트 핸들러들을 참고했습니다. 잘 만들어진 소스코드는 좋은 공부 자료입니다.

![](/blog/Dev/Unity/t5/14_img.png)

_Joystick 클래스에서 사용된 IPointerDownHandler 등의 여러 이벤트 핸들러 인터페이스들._

이벤트 핸들러와 콜백함수를 통해 이 클래스가 있는 오브젝트의 UI를 터치/클릭 시작했는지, 하는중인지, 드래그 중인지, 뗐는지 등의 상황에 따라 알맞은 연산을 수행할 수 있습니다. 카메라를 회전시키기 위해서 **BeginDrag, Drag**에 대해서만 체크해주면 됩니다. 코드 먼저 보면 다음과 같습니다.

```csharp
using UnityEngine;
using UnityEngine.EventSystems;

public class RotateCam : MonoBehaviour, IBeginDragHandler, IDragHandler {

   public Transform camPivot;
   public float rotationSpeed = 0.4f;

   Vector3 beginPos;
   Vector3 draggingPos;
   float xAngle;
   float yAngle;
   float xAngleTemp;
   float yAngleTemp;

   private void Start() {
      xAngle = camPivot.rotation.eulerAngles.x;
      yAngle = camPivot.rotation.eulerAngles.y;
   }

   public void OnBeginDrag(PointerEventData beginPoint)
   {
      beginPos = beginPoint.position;

      xAngleTemp = xAngle;
      yAngleTemp = yAngle;
   }

   public void OnDrag(PointerEventData draggingPoint)
   {
      draggingPos = draggingPoint.position;

   // 2022.10.13(THU) 수정
      yAngle = yAngleTemp + (draggingPos.x - beginPos.x) * Screen.height / 1080 * rotationSpeed * Time.deltaTime;
      xAngle = xAngleTemp - (draggingPos.y - beginPos.y) * Screen.width / 1920 * rotationSpeed * Time.deltaTime;

      if (xAngle > 30) xAngle = 30;
      if (xAngle < -60) xAngle = -60;

      camPivot.rotation = Quaternion.Euler(xAngle, yAngle, 0.0f);
   }
}
```

변수들의 쓰임은 다음과 같습니다.

- 드래그를 **시작**할 때의
  **스크린의 좌표**
  를 저장할 **beginPos**

- **드래그**중인 **스크린의 좌표**를 저장할 **draggingPos**

- 드래그를 하기 **전후**의 camPivot의 rotation값을 저장할 **Angle** 변수들

- 드래그를 **시작**할 때의 camPivot의 rotation값을 저장할 **AngleTemp** 변수들

로직은 다음과 같습니다.

- Angle을 초기화해주고, 드래그 시작할 때의 스크린좌표와 Angle을 따로 빼 둡니다. (통틀어서 Temp라 합시다)

- 드래깅 중일 때의 스크좌표와 Temp의 스크린좌표의 차이를 통해 변화량을 구하고, Angle에 더해 줍니다. 이 때 방향이 중요한데, 스크린좌표는 왼쪽 위가 (0,0)이고 아래, 오른쪽으로 갈 수록 그 값이 커지는데, **아래(screen-y)로 드래깅 할 때는 xAngle이 그만큼 감소해야** 하고, **오른쪽(screen-x)으로 드래깅 할 때는 yAngle이 그만큼 증가해야** 합니다. 회전**축**에 대해서 잘 생각해보면 왜 그런지 알 수 있습니다.

- **디바이스 크기 변화**
  에 대응하기 위해 각
  **변화량**
  을 Screen.width, Screen.height로 나눠 줍니다.

- 위/아래로 화면을 꺾을 수 있는 상/하한선을 정해 줍니다. xAngle의 최대/최소값을 if문으로 구현합니다.

- 산전수전을 겪은 xAngle과 yAngle을 Euler각의 x, y 에 대입 해주고, z는 0으로 하며, 그 Euler 각을 Quaternion으로 변환하여 camPivot.rotation 값에 대입해 줍니다.

이렇게 해주었더니 보는 것과 같이 화면**은** 잘 돌아갑니다.

![](/blog/Dev/Unity/t5/15_img.gif)

뭔가 이상합니다. 카메라를 y축으로 180도정도 돌렸더니 이동이 반전되는 것을 알 수 있습니다.

이는 처음에 이동을 구현할 때, 오브젝트의 회전값과 이동값을 '조이스틱 포인터의 좌표'에**만**영향을 받도록 했기 때문입니다. 이를 고치려면 맨 처음 만들었던 오브젝트이동 스크립트로 가서, moving_object의 y축 rotation이 CamPivot에게도 영향을 받도록 만들어야 합니다.

## 4. 이동 스크립트 수정

아까 그 코드를 다시 가져와서 보면,

```csharp
using UnityEngine;

public class MoveObject : MonoBehaviour
{
    public Transform moving_object;
    public float speed = 20f;

    private Joystick controller;
    private void Start() {
        controller = this.GetComponent<Joystick>();
    }

    private void FixedUpdate()
    {
        Vector3 moveDir = new Vector3(controller.Vertical, 0, controller.Horizontal);

        if(moveDir == Vector3.zero) return;

        moving_object.rotation = Quaternion.LookRotation(moveDir);
        moving_object.Translate(Vector3.forward * Time.fixedDeltaTime * speed);
    }
}
```

여기에서 moveDir 는 조이스틱(controller) 포인터의 좌표를 단순히 3차원의 xz 축에다 옮겨 놓은 것이었는데, 실제 이동해야 하는 방향과는 괴리가 있기 때문에 이제는 그 이름을 controllerDir라고 다시 지어 줘야 할 것 같습니다. (VSCode를 사용한다면 F2를 눌러서 수정하고 엔터 치면 나머지도 알아서 수정됩니다.)

```csharp
Vector3 controllerDir = new Vector3(controller.Vertical, 0, controller.Horizontal);
```

또 camPivot의 rotation값을 얻어야 하기 때문에 다음과 같이 선언해 줍시다.

```csharp
public Transform camPivot;
```

camPivot이 가지는 오일러각, controllerDir가 바라보는 오일러각을 저장하는 변수들을 새로 만들어 줍시다. (Euler각은 Vector3 타입으로 저장됩니다. 둘은 동시에 쓰일 수 있으나 사용할 때에는 변환에 유의해야 합니다.)

```csharp
Vector3 camPivotAngle = camPivot.rotation.eulerAngles;
Vector3 conDirAngle = Quaternion.LookRotation(controllerDir).eulerAngles;
```

직관적으로 생각해보면, 카메라가 바라보고 있는 방향에서 앞을 누르면 앞으로 가야 합니다. 즉, camPivot이 가리키는 방향을 기준으로 움직여야 하는 것이죠.

시계를 생각해봅시다. 만약 camPivot이 12시 방향을 가리킬 때 오른쪽을 눌렀다면, 오브젝트는 3시 방향으로 가야 합니다.

그렇다면 camPivot이 3시 방향을 가리킬 때 오른쪽을 누른다면? 오브젝트는 6시 방향으로 가야 합니다. 왼쪽을 누르면 12시 방향으로 가야 하죠. 여기서 이들을 오일러 각 기준으로 생각해볼 때,

#### camPivotAngle(3시 : 90도) + conDirAngle(오른쪽 : 90도) = 6시 (180도)

인 것을 알 수 있습니다. 즉, 두 각을 더하면, 최종적으로 오브젝트가 움직여야 할 각도가 나옵니다. 이 때 XZ 평면으로만 움직이기 때문에 회전축은 y축이며, 당연히 LookRotation을 통해 얻은 conDirAngle의 x, z 성분은 모두 0이라서 딱히 상관 없지만, camPivot은 x, y 축을 회전축으로 하여 회전하므로 camPivotAngle에서는 y축만 고려해야 합니다. 따라서 최종 각은 다음과 같습니다.

#### Vector3

.

up

-

(

conDirAngle

.

y

-

camPivotAngle

.

y

)

이 Euler각을 Quaternion으로 변환하여 moving_object.rotation 에 넣어주면 됩니다.

```csharp
using UnityEngine;

public class MoveObject : MonoBehaviour
{
    public Transform moving_object;
    public float speed = 20f;
    public Transform camPivot;

    private Joystick controller;
    private void Awake() {
        controller = this.GetComponent<Joystick>();
    }

    private void FixedUpdate()
    {
        Vector3 controllerDir = new Vector3(controller.Vertical, 0, controller.Horizontal);

        if (controllerDir == Vector3.zero) return;

        Vector3 conDirAngle = Quaternion.LookRotation(controllerDir).eulerAngles;
        Vector3 camPivotAngle = camPivot.eulerAngles;

        Vector3 moveAngle = Vector3.up * (conDirAngle.y + camPivotAngle.y);

        moving_object.rotation = Quaternion.Euler(moveAngle);
        moving_object.Translate(Vector3.forward * Time.fixedDeltaTime * speed);
    }
}
```

다 된 것 같습니다. 겉보기에는 말이죠. 아니 또 뭐가 문제냐 이사람아!

지금 구현하고 있는 것은 **XZ평면**상에서만 오브젝트를 이동하는 것이다. 다시 말하면 **2차원 공간**에서 움직이는 거나 다름이 없습니다. 물론 결과값은 3차원이어야 하는 것이 맞지만, 연산에만 쓰이는 것들까지 3차원일 필요는 없는 것입니다. 연산에 쓰이는 변수들을 2차원 벡터나 실수들만으로 한정한다면 미세하게라도 연산 부하를 줄일 수 있지 않을까요?

## 5. 조이스틱과 삼각함수

삼각함수는, 고등학교 때 처음 접했을 때는 정말 무지막지하고 무섭게만 느껴졌지만 실제로는 그렇게 무서운 친구는 아닙니다. 겉모습만 보고 판단하는 것... 반성해야 합니다. 삼각함수 및 역삼각함수에 대해 잘 모른다면 구글링!

![](/blog/Dev/Unity/t5/16_img.png)

조이스틱이라는, 반지름의 길이가 1인 원을 봅시다.

여기서 보라색 점은 조이스틱 포인터의 위치입니다. 코드에서 controller.Direction로 표현됩니다.

조이스틱이 원 안의 임의의 점 (x, y)에 있을 때, camPivot.rotation.y 값에 저 핑크색
θ
(세타, theta)를 더한 값을 오브젝트의 rotation으로 설정해주면 됩니다.

d = 보라색벡터의 길이 라고 하면,
**d\*cos(
θ) = y\*\***cos(
θ) = y/d\*\*
**θ =
acos(y/d)** 이고,

이를 Euler 각도로 표현하려면
θ에
(180/
π)를 곱하면 됩니다.
아크코사인과 파이(
π
)는 유니티에서 Mathf.Acos(float), Mathf.PI 로 얻을 수 있습니다

그런데 x가 음수로 변해도 y가 동일하기 때문에
θ가 양수값이 나옵니다. 즉, 오른쪽으로 갈 때는 상관 없지만, 왼쪽으로 갈 수가 없다는 얘기입니다. 이 문제를 해결하려면 if문으로 해결해도 되지만, 'x의 부호'만 세타값에 곱해주면 되겠습니다. 이는 Mathf.Sign(float) 이라는 함수로 구할 수 있습니다. 그래서 다음과 같은 코드가 나옵니다.

```csharp
using UnityEngine;

public class MoveObject : MonoBehaviour
{
    public Transform moving_object;
    public float speed = 20f;
    public Transform camPivot;

    private Joystick controller;
    private void Awake() {
        controller = this.GetComponent<Joystick>();
    }

    private void FixedUpdate()
    {
        Vector2 conDir = controller.Direction;
        if(conDir == Vector2.zero) return;

        float thetaEuler = Mathf.Acos(conDir.y/conDir.magnitude) * (180 / Mathf.PI) * Mathf.Sign(conDir.x);

        Vector3 moveAngle = Vector3.up * (camPivot.transform.rotation.eulerAngles.y + thetaEuler);
        moving_object.rotation = Quaternion.Euler(moveAngle);
        moving_object.Translate(Vector3.forward * Time.fixedDeltaTime * speed);
    }
}
```

훨씬 깔끔하고 간결해졌습니다!

![](/blog/Dev/Unity/t5/17_img.gif)

_완성!_

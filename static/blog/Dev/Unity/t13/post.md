---
title: '유지보수성과 성능을 모두 챙기는 방법 - 데이터 변경에 따른 콜백과 MVC 분리'
date: 2022-03-22 17:34
tistory: https://saens.tistory.com/13
---

### 0. 개요

데이터가 변경됨에 따라 특정 작업을 수행해야 하는 경우가 있습니다. 예를 들면 HP 값이 변경될 때, 동시에 UI를 갱신해야 하는 경우가 있을 텐데, 이 때 UI를 관리하는 클래스에서 Update()를 통해 HP 데이터를 가진 클래스를 참조하여 HP 값을 매 프레임마다 계속 관찰하면서 UI를 갱신할 수도 있지만, 이는 성능 상 좋지 않다는 것을 모두 알 것입니다. 대신에 HP가 변경되는 시점에만 UI 갱신 작업을 수행하도록 하면 성능을 높이고 코드의 유지보수성도 향상시킬 수 있습니다.
이 글에서는 C#의 delegate를 이용하여 데이터 변경에 대한 이벤트 등록/발생을 쉽게 구현하고, 더 나아가 이를 통해 유니티에서 [MVC](https://ko.wikipedia.org/wiki/%EB%AA%A8%EB%8D%B8-%EB%B7%B0-%EC%BB%A8%ED%8A%B8%EB%A1%A4%EB%9F%AC)를 바람직하게 분리할 수 있음을, 또한 그 MVC 각각을 Scene의 hierarchy 어느 곳에 위치시킬 지에 대하여 자세히 설명 드리려 합니다.

### 1. Getter와 Setter

어떤 데이터를 참조/변경할 때 우리는 다음과 같이 'getter'와 'setter'를 사용합니다. 메서드를 직접 선언하거나 Property를 이용하여 구현할 수 있습니다.

```C#
private int hp;

// 메서드 사용
public int GetHP()
{
    return this.hp
}
public void SetHP(int hp)
{
    this.hp = hp;
}

// Property 사용
public int Hp
{
    get { return this.hp; }
    set { this.hp = value; }
}
```

다음과 같이 HP의 setter 메서드에 HP UI를 변경하는 코드를 추가하여 HP 값이 변경될 때에만 HP UI가 변경되도록 만들 수 있을 것입니다.

```C#
private UIView ui;

public int Hp
{
    get { return this.hp; }
    set
    {
        this.hp = value;
        ui.UpdateHpUI(this.hp);
    }
}
```

### 2. Model과 View의 의존성

위의 코드를 보면 Hp라는 데이터를 가진 클래스(이하 **PlayerData**)가, UpdateHpUI()라는 메서드를 호출하기 위해 해당 UI 클래스(이하 **UIView**)를 참조해야 합니다. 그러면 HP의 변경에 따라 달라져야 할 사항들을 다루는 (예를 들면, HP가 10% 미만일 때 화면이 빨갛게 된다거나, 캐릭터에 출혈 이펙트를 준다거나 하는 등) 수많은 View 클래스들을 참조해야 할 것이고, 이 클래스가 너무 방대해질 것이며, 유지보수에 큰 해가 될 것이 뻔합니다. 따라서 Model이 View를 참조하는 것 보다는, View가 Model을 참조하도록 하는 게 바람직해 보입니다.
그런데 MVC 패턴을 **얼핏** 알고 있는 사람이라면, 다음 그림을 떠올리며 뭔가 이상하다는 것을 느낄 수도 있습니다.

![](/blog/Dev/Unity/t13/01_img.png)

_출처 : 위키피디아_

그림에서는 화살표가 MODEL → VIEW 방향인데, VIEW → MODEL 방향으로 참조하라니? 라는 의문이 들 수 있습니다. 하지만 여기서 명심해야 할 것은, 위 그림에서 화살표를 '참조 관계'가 아니라, '작업 흐름'으로 인식해야 한다는 점입니다. Model의 변화가 View를 갱신시키는 작업의 흐름이, 반드시 Model이 View를 참조해야 한다는 뜻이 아닌 겁니다. 아키텍처 원칙 S.O.L.I.D 중 하나인 DIP(의존성 역전 원리)를 통해, 인터페이스를 사용하여 작업의 흐름과 참조 흐름이 반대 방향이 되도록 만들 수 있습니다. 그리고 그런 원칙을 사용한 디자인 패턴이 **Observer Pattern**입니다.
C#에서는 인터페이스를 사용하지 않더라도, 언어 차원에서 간단하게 콜백을 등록/발생시켜 옵저버 패턴을 간단하게 구현할 수 있습니다.

### 3. Delegate

System namespace에 있는 Action이나 Func과 같은 delegate를 통하면, 메서드를 할당하여 변수처럼 사용할 수 있습니다. 이는 콜백 기능을 구현할 때 유용하게 사용됩니다.
Model에 Action<int> **onChangeHp**를 선언하고 View에서 Model의 onChangeHp에 알맞은 메서드(**UpdateHpUI**)를 할당한 뒤, 데이터의 setter에서 onChangeHp를 Invoke하면, 참조 관계는 View → Model 이지만, 작업의 흐름은 Model → View 가 될 것입니다.
글보다 코드를 보는 게 이해하기에 더 쉬울 것 같네요. 아래 코드의 Model 클래스(PlayerData)는 Scriptable Object로 만들었습니다.

1. Model : PlayerData.cs

```
using UnityEngine;
using System;

[CreateAssetMenu(fileName = "PlayerData", menuName = "Data/PlayerData")]
public class PlayerData : ScriptableObject
{
    private int hp;
    public Action<int> onChangeHp;
    public int Hp
    {
        set
        {
            this.hp = value;
            onChangeHp?.Invoke(value);
        }
    }
}
```

1. View : UIView.cs

```
using UnityEngine;

public class UIView : MonoBehaviour
{
    public PlayerData playerData;

    private void OnEnable() // 할당
    {
        playerData.onChangeHp += UpdateHpUI;
    }
    private void OnDisable()
    {
        // Scene 변경될 때 오브젝트가 유지되는 상태가 아니라면 이 오브젝트의 메서드를 사용해서는 안되므로 해제.
        playerData.onChangeHp -= UpdateHpUI;
    }

    private void UpdateHpUI(int hp)
    {
        // DO SOMETHING
    }
}
```

UIView의 playerData에는 유니티 에디터에서 PlayerData의 Scriptable Object 인스턴스를 만들고 직접 드래그해서 집어 넣어주면 됩니다. Scriptable Object에 대한 자세한 사항은 각자 구글링 하여 알아봅시다 :)
그런데, 이렇게 변경에 따라 무언가를 수행해야 하는 데이터는 HP 뿐만이 아닙니다. MP, EXP, Stamina, Level 등... 수 많은 데이터가 변경과 함께 어떤 작업을 수행해야 할 것입니다. 그러한 데이터마다 Action<T>를 선언해주고, setter에서 onChange~ 대리자를 Invoke해주는 코드를 짜는 것은 귀찮은 작업이겠죠.

### 4. Data Generic Class

데이터가 변경되고 어떤 작업이 동반되어야 하는 모든 경우에, setter에서 delegate를 invoke하는 위의 방식을 공통적으로 사용하기로 정했다면, 그러한 데이터는 다음과 같이 따로 클래스로 만들어 번거로운 작업을 덜 수 있을 것입니다.

```
using UnityEngine;
using System;

public class Data<T>
{
    private T v;
    public T Value
    {
        get
        {
            return this.v;
        }
        set
        {
            this.v = value;
            this.onChange?.Invoke(value);
        }
    }
    public Action<T> onChange;
}
```

이렇게 하고 나면, Model 클래스에서는 **int hp;** 가 아닌, **Data<int> hp = new Data<int>();** 와 같은 형태로 데이터를 한 번 선언만 하면, setter나 Action 대리자 선언 및 Invoke하는 코드를 하나씩 작성할 필요가 없습니다.

**Data<T>** 를 도입하면 Model과 View의 코드는 다음과 같아집니다.

1. Model : PlayerData.cs

```
using UnityEngine;

[CreateAssetMenu(fileName = "PlayerData", menuName = "Data/PlayerData")]
public class PlayerData : ScriptableObject
{
    public Data<int> hp = new Data<int>();
}
```

1. View : UIView.cs

```
using UnityEngine;

public class UIView : MonoBehaviour
{
    public PlayerData playerData;

    private void OnEnable()
    {
        playerData.hp.onChange += UpdateHpUI;
    }
    private void OnDisable()
    {
        playerData.hp.onChange -= UpdateHpUI;
    }

    private void UpdateHpUI(int hp)
    {
        // DO SOMETHING
    }
}
```

View 클래스는 변함이 없지만, Model 클래스 코드의 길이가 상당히 줄은 것을 볼 수 있습니다. 데이터가 단 하나 뿐이었는데도 말이죠. 다른 데이터까지 추가되면 Data<T> 클래스는 더욱 유용합니다.
위의 코드에서는 데이터를 변경하는 경우만 고려했지만, 단순 참조의 경우에도 setter의 경우와 같이 onReadHp와 같은 Action 대리자를 선언해서 getter에서 해당 대리자를 Invoke하도록 하고, View의 OnEnable/Disable 함수에서 적절한 메서드를 할당/해제해주면 됩니다.

Data<T> 클래스를 Scriptable Object로 만들면, 데이터 자체를 하나의 파일처럼 만들어 인스펙터에서도 다룰 수 있게 되는데, 이에 대한 자세한 방법은 [이 글](https://saens.tistory.com/23)에서 설명합니다.

### 5. Controller

이제 Controller에서 hp값을 참조하거나 변경하려면 다음과 같이 코드를 작성하면 됩니다.

```
public PlayerData playerData;

public void Foobar()
{
    Debug.Log(playerData.hp.Value); // 참조
    playerData.hp.Value = 30; // 변경
}
```

이렇게 구현하면 Controller가 View를 참조하지 않고 Model의 데이터만 변경해도 데이터의 내부에 있는 Action, 즉 이벤트의 발생을 통해 결과적으로 View를 변경할 수 있고, 세 요소 간의 의존성을 최소화시켜 다음과 같이, 사이클이 발생되지 않는 바람직한 그림을 만족시킬 수 있습니다. 저는 이를 (굳이..) "VMC"라고 부르고 싶군요. View와 Controller 중간에 Model이 껴있고 작업 흐름의 통로가 되니까요.

![](/blog/Dev/Unity/t13/02_img.png)

_의존성과 작업 흐름_

데이터의 변경만으로 모든 작업을 진행할 수 있다면 이러한 방식이 이해하기에도 간단하고 프로그램(게임)을 더 쉽게 만들 수 있습니다. 다만 그렇지 않다면 추가로 Controller가 View를 참조하는 것까지는 허용할 수 있겠죠. 그렇게 해도 컴포넌트 간 사이클이 생기지 않기 때문입니다. 그리고 그러한 경우, 위 그림과는 조금 다르지만 아래와 같은, 일반적인 MVC 패턴의 의존성 흐름이 나타납니다.

![](/blog/Dev/Unity/t13/03_img.png)

_MVC Pattern_

### 6. Scene Hierarchy

이렇게 만들어진 Controller와 View, Model을 Scene의 어느 오브젝트에 만들어야 할 지 정하는 것은 제가 수 년간 제 머리를 너무도 아프게 했던 주제인데요, 결국 저는 다음과 같은 규칙을 지키기로 결론을 내렸습니다.

1. Model: Scriptable Object 또는 static class로 관리
2. Controller: 해당 Scene에서 Controller만 모아두는 하나의 빈 GameObject를 만들고 거기에 모아두기
3. View: 어떤 데이터 변경 이벤트가 발생했을 때 수정해야 할 시각적 형태가 있는 오브젝트들을 모두 포함하는 부모 오브젝트

이 세가지 규칙이 만능은 아닙니다. 하지만 이런 식으로 최대한 일관성 있게 개발하다 보면 이렇게 질서 정연하게 개발해 준 과거의 나에게 고마워질 때가 있습니다. 과거의 나에게 욕하지 않는 것만 해도 대단한 성과일지도 모르겠네요 ㅎㅎ

😇 여담

이 글에 써있는 내용이 독자분들에게 도움이 되었으면 좋겠지만, 그렇지 않을 수도 있습니다. 그래도 참고하셔서 각자에게 맞는 방법을 찾아가실 수 있으면 좋겠습니다. 나에게 정말로 필요한 것들을 조합해서 나만의 또 다른 패턴을 만들어 내려 노력하는 것은 개발자로서 역량을 키우는 데에 중요한 역할을 할 것이라고 믿거든요. 열심히 고안해 내었지만 이미 있던 패턴이어도 상관 없습니다. 그걸 더욱 깊이 이해할 수 있는 기반이 되기 때문입니다.

틀린 개념이나 표현, 또는 더 나은 방법이 있다면 언제든지 피드백 부탁드립니다. 질문도 환영입니다!

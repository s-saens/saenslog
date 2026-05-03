---
title: '편리한 데이터 관리 - Data Scriptable Object'
date: 2023-04-21 21:05
tistory: https://saens.tistory.com/23
---

데이터를 수정하게 되면 거의 대부분 UI에 표시하기, 값에 따라 어떤 이벤트 발생시키기 등의 **추가 작업**이 동반 됩니다. Update함수를 통해 매 프레임마다 데이터의 값을 확인하고 반영하는 작업을 수행할 수 있지만, 이 방법이 권장되지 않는다는 것은 많은 분들이 아실 것입니다.

이러한 문제를 해결하기 위해 Observer Pattern 이 종종 이용되는데, 데이터 자체에 값 변경시 필요한 작업을 **등록(Register)**하고, 값을 변경할 때 자동으로 등록된 작업들을 **수행**하도록**(Invoke)** 합니다. 그래서 고안한 것이 "데이터를 작업과 함께 묶어주는 클래스를 만들자"였습니다. 이에 [이전 글](https://saens.tistory.com/13)에서 **Data<T>**라는 클래스를 만들어 주었죠.

그런데 이에 더해서, 데이터 자체를 인스펙터에서 **블록 형태**로 등록하고 관리할 수 있다면 굉장히 편리할 것입니다. 그래서 Data<T>를 Scriptable Object로 만든 형태인 **SData<T>** 를 소개하려 합니다.

필수 개념 : **객체지향**, Generic, Component, ScriptableObject

## 목차

- SData<T>

- 타입을 명시한 하위 클래스

- 응용 - DataTextView<T>

- 응용 - PlayerPrefsData<T>

### 1. SData<T>

```csharp
using UnityEngine;

public abstract class SData<T> : ScriptableObject where T : IEquatable<T>
{
    protected T v;
    Action<T> onChange;
    public virtual T val {
        get {
            return v;
        }
        set {
            if((v != null || value != null) && v.Equals(value)) return;
            v = value;
            onChange.Invoke(v);
        }
    }

    public void Register(Action<T> onChange, Action disposer)
    {
     this.onChange += onChange;
        disposer += () => this.onChange -= onChange;
    }
}
```

코드가 곧 내용, 코곧내입니다. 핵심은 값 v를 프로퍼티 val을 통해 접근하며, val의 set에서 onChange를 Invoke하는 구조라는 점입니다. 별 거 없죠?

프로퍼티 val 앞에 붙은 virtual 키워드는, 아래**4. 응용 - PlayerPrefsData<T>**에서 확인하실 수 있다시피 파생되는 클래스에서 val을 재정의할 수 있게 하기 위함입니다. (프로퍼티는 변수가 아니라 메서드입니다.)

추가로 setter에서 파라미터로 들어온 값이 기존 값과 일치하는 경우 업데이트를 건너뛰기 위해 T가 Eqaul(T) 함수를 가지도록 제네릭 T 타입이 IEquatable<T> 인터페이스를 구현한다는 조건을 추가했습니다.

가장 중요한 부분은 Register입니다. 데이터 변경 시 호출되어야 할 delegate를 등록하는데, disposer라는 것도 함께 넘겨줍니다. 그 이유를 짚고 넘어갑시다.

```csharp
using UnityEngine;
using System;

public class MyView : MonoBehaviour
{
 public SData<int> hp;
    public SData<int> mp;
    public SData<int> sp;
    ...

    Action disposer;

    void OnEnable()
    {
     hp.Register(OnChangeSomething, disposer);
     mp.Register(OnChangeSomething, disposer);
     sp.Register(OnChangeSomething, disposer);
    }

    void OnDisable() => disposer?.Invoke();

    void OnChangeSomething(int value) => Debug.Log(value);
}
```

OnEnable()에서 SData<int> 내에 있는 onChange에 어떤 메서드를 등록하면, 이를 반드시 직접 해제해줘야 합니다. 가령 해제해주지 않고 다른 Scene으로 옮겨도 위의 예제에서 hp의 onChange에 등록된 OnChangeSomething에 대한 참조는 아직 남아있는데, 이 때 hp가 변경된다면, 파괴된 MonoBehaviour 클래스의 OnChangeSomething에 접근하려 하기 때문에 에러가 납니다.

그래서 위에서와 같이 disposer라는 delegate를 넘겨주면 Register에서는 onChange에 등록된 해당 작업을 해제하는 작업 자체를 disposer에 등록하게 되고, 이는 OnDisable()에서 실행되어 안전하게 Scene을 벗어날 수 있게 됩니다.

### 2. 타입을 명시한 하위 클래스

클래스에 제네릭 표현이 있는 상태로는 유니티에서 SO로 써먹을 수 없습니다. 그래서 타입을 명시한 하위 클래스를 새로 만들어줘야 하는데, 다음과 같은 아주 짧은 코드를 가진 스크립트를 만들면 됩니다. 스크립트의 이름은 클래스의 이름과 동일해야 한다는 점, 아시죠?

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "SAENS/DataSO/String")]
public class SDataString : SData<string> {}
```

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "SAENS/DataSO/Int")]
public class SDataInt : SData<int> {}
```

이렇게 타입이 명시된 Data의 하위 클래스들을 만들고 나면 유니티의 Project 탭에서 다음과 같이 SO 인스턴스를 만들 수 있습니다.

![](/blog/Dev/Unity/t23/01_img.png)

**데이터 하나에 SO 하나**인 셈입니다. 그래서 사실 관리해야 하는 데이터가 많다면 귀찮아질 수 있습니다. 하지만 처음에만 잠깐 견딘다면 성능, 확장성, 재사용성 등의 커다란 이득을 볼 수 있습니다.

이제 Unity의 Projects 탭에서, 타입이 명시된 Data SO 파일을 만들어 이를 이용해 필요한 작업(Register, Invoke)을 수행하면 됩니다.

```csharp
using UnityEngine;
using System;
using TMPro;

public class MyView : MonoBehaviour
{
    [SerializeField] SDataString name;
//  [SerializeField] SData<string> name; 으로 작성해도 무방합니다.
    [SerializeField] SDataInt age;

 Action disposer;

    void OnEnable() // 등록 Register
    {
     name.Register(OnChangeName);
     name.Register(OnChangeAge);
    }
    void OnDisable() // 해제 Unregister
    {
     disposer?.Invoke();
    }

    [SerializeField] TMP_Text nameText;
    [SerializeField] TMP_Text ageText;

    void OnChangeName(string value)
    {
     nameText.text = value;
    }

    void OnChangeAge(int value)
    {
     ageText.text = value.ToString();
    }
}
```

```csharp
using UnityEngine;

public class MyController
{
    [SerializeField] SDataString name;
    [SerializeField] SDataInt age;

    void ChangeValues(string name, int age)
    {
     this.name.val = name;
        this.age.val = age;
    }
}
```

DataString SO를 인스펙터에서 받아 View에서는 값이 변경될 때 수행할 UI 작업을 disposer와 함께 등록하고, Controller에서는 이를 Invoke시킵니다.  
Controller → Model(SO) ← View
 이러한 의존성을 띄며 Controller와 View가 서로 의존하지 않은 채로 필요한 작업을 적절히 수행할 수 있습니다.

이 때, Controller에 해당하는 클래스를 따로 작성할 필요가 없을 수도 있습니다. 다음과 같이 유니티 기본 UI Button과 같이 UnityEvent 객체를 필드로 가지는 컴포넌트라면, 해당 필드에 SO도 등록할 수가 있기 때문입니다. 다음과 같이 Data<T>의 프로퍼티 val의 set 메서드를 등록할 수 있습니다. 이 경우에는 Button 컴포넌트의 onClick이 Controller 라고 볼 수 있겠네요.

![](/blog/Dev/Unity/t23/02_img.png)

### 3. 응용 - DataView<T>

기존에는 데이터가 코드상에서만 존재했기 때문에 데이터를 UI에 표시하려 할 때마다 비슷한 데이터끼리 묶어 한꺼번에 업데이트 해주기 위한 스크립트를 작성했었습니다. 하지만 이제 데이터가 Component화 되었기 때문에 (MonoBehaviour, Scriptable Object는 Component 클래스의 하위 클래스이기 때문에 Inspector에서 참조가 가능) 타입과 특정 동작만 정의한다면 데이터가 정확히 무엇인지 알 필요 없이 타입에 맞는 Data SO를 필드에 집어 넣기만 하면 알아서 UI에 표시해주는 기능을 만들 수 있습니다.

a) 다음과 같이 Data<T>를 상속받는, **추상 메서드 UpdateView를 등록/해제하는 작업만 정의**한 추상 클래스를 만듭니다.

```csharp
using UnityEngine;
using System;

public abstract class DataView<T> : MonoBehaviour where T : IEquatable<T>
{
    [SerializeField] SData<T> data;
    Action disposer;

    void OnEnable()
    {
        data.Register(UpdateView, disposer);
        UpdateView(data.val);
    }

    void OnDisable() => disposer?.Invoke();

    protected abstract void UpdateView(T s);
}
```

b) 그 다음에는 **UpdateView의 동작만을 정의**한 DataTextView<T> 클래스를 만듭니다.

```csharp
using UnityEngine;
using System;
using TMPro;

public abstract class DataTextView<T> : DataView<T> where T : IEquatable<T>
{
    [SerializeField] TMP_Text text;
    [SerializeField] string prefix;
    [SerializeField] string suffix;

    protected override void UpdateView(T s)
    {
     text.text = $"{prefix}{s.ToString()}{suffix}";
    }
}
```

c) 필요한 타입만 명시한 채로 DataTextView{Type} 클래스들을 만듭니다. Data<T> 의 타입을 명시한 것과 같은 이유입니다. DataView<T>가 MonoBehaviour이지만 제네릭 표현이 있을 경우에는 인스펙터에서 사용할 수 없기 때문입니다.

```csharp
public class DataTextViewString : DataTextView<string> {}
```

```csharp
public class DataTextViewInt : DataTextView<int> {}
```

d) 마지막으로 다음과 같이 컴포넌트를 추가한 후 적절히 필드를 채워주면 완성입니다.

![](/blog/Dev/Unity/t23/03_img.png)

이 타입과 동작에 한해 앞으로 데이터가 무엇인지에 상관 없이 얼마든지 컴포넌트를 재사용할 수 있습니다. 또한 동작과 타입을 재정의하는 클래스를 작성하는 것 역시 위에서 보셨다시피 그리 어렵지 않습니다.

### 4. 응용 - PlayerPrefsData<T>

글 [[Unity] PlayerPrefs - 암호화 및 임의 객체 저장](https://saens.tistory.com/22)에서는, PlayerPrefs에 JSON 변환과 암호화를 묻혀 좀더 유연하고 안전하게 PlayerPrefs를 사용할 수 있도록 하는 확장 코드를 소개했습니다. 해당 글의 기능을 사용하면서 Data<T>의 val 프로퍼티를 적절히 재정의하면 PlayerPrefs를 훨씬 편하게 관리할 수 있습니다.

```csharp
using UnityEngine;
using System;

public class PlayerPrefsData<T> : SData<T> where T : IEquatable<T>
{
    [SerializeField] string key;
    [SerializeField] T defaultValue;

    public override T val
    {
        get => v == null ? PlayerPrefsExt.GetObject<T>(key, defaultValue) : v;
        set
        {
            base.val = value;
            PlayerPrefsExt.SetObject(key, v);
        }
    }
}
```

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "SAENS/DataSO/Prefs/String")]
public class PlayerPrefsDataString : PlayerPrefsData<string> { }
```

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "SAENS/DataSO/Prefs/Int")]
public class PlayerPrefsDataInt : PlayerPrefsData<int> { }
```

Data<T>의 자식오브젝트이기 때문에,
**3. 응용 - DataView<T>**
에서 작성한 DataView<T>의 **data** field를 굳이 PlayerPrefsData<T> 타입으로 바꿔주지 않아도 다음과 같이 PlayerPrefsData SO를 바로 넣어줄 수 있습니다.

![](/blog/Dev/Unity/t23/04_img.png)

이제 HP 값을 수정하기만 해도 별 다른 작업 없이 PlayerPrefs에 암호화되어 저장됩니다.

---

이 기술(?)은 확장할 때 더 빛납니다.
이 글에 있는 응용 예제들은 제 프로젝트에 SData<T>가 적용된 사례를 일부만 소개했을 뿐입니다. 데이터와 뷰를 바인딩하는 일 뿐만 아니라 게임 로직, 네트워크 비동기 작업에서 Event처럼 사용될 수 있습니다. (Event에 값을 가진 객체 개념을 더한 것과 다름이 없기는 합니다.)

그래서 객체지향 개념을 제대로 모르신다면 오히려 더 헷갈리고 어려울 수 있지만, 잘 알고 실제로 적극 활용하고 있는 분들에게는 굉장히 유용할 것이라고 확신합니다.

- 데이터를 한 번 더 감싸 클래스로 만든 것이기 때문에 SData<T>를 사용하는 하나의 MonoBehaviour 클래스에 대해 기본적으로 disposer라는 Action이 있어야 하기 때문에 약 8~16바이트, 그리고 데이터 하나 당 약 30바이트 정도의 메모리 오버헤드가 발생한다고 합니다. 이는 GC 호출 주기에도 악영향을 줄 수 있습니다.

- delegate를 통해 메서드를 참조하여 호출하는 과정에서 성능적인 오버헤드가 작지만 발생합니다. 따라서 굉장히 빠른 속도로(예를 들면 매 프레임마다) 데이터가 변경된다면 이는 무시 못할 오버헤드가 될 것이고, 차라리 Update 함수를 쓰는 편이 좋습니다.

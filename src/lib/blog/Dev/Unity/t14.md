---
title: 'Animation 에셋을 관리하는 특이한 방법 : Animation Clip into Animator Controller'
date: 2022-04-08 00:03
tistory: https://saens.tistory.com/14
---

2021.2.15f apple silicon 버전 기준으로 작성되었습니다.

### 0. 글을 읽기 전 알아두기

[유니티 버튼 애니메이션 Transition - Animation

유니티 버튼 애니메이션 Transition - Animation 버튼 눌렸을때 애니메이션 만들기 Button Script의 T...

blog.naver.com](<https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=luvtoma&logNo=221122343330>)

[[에디터 확장 입문] 번역 26장 AssetDatabase

<http://anchan828.github.io/editor-manual/web/asset_database.html26장> AssetDatabase AssetDatabase...

blog.naver.com](<https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=hammerimpact&logNo=220780942881>)

이 글에서는 Animation Clip을 Animation Controller 하위에 위치시키도록 하는 방법을 소개합니다. 상당히 실험적인 내용이라, 크게 쓸모 있지 않을 수도 있습니다만, 그 과정에서 재미있는 개념들을 배울 수 있습니다.

### 1. Animation Controller 내부에 있는 Animtion Clip

Button Component에서 Transition 타입을 Animation으로 바꾸게 되면, 버튼의 상태에 따라 Trigger를 통해 Animator를 조작하고, 시각적인 효과를 줄 수 있습니다. 그 자세한 방법은 구글에 검색하면 쉽게 찾아볼 수 있습니다.

![](/blog/Dev/Unity/t14/01_img.png)

그런데 위 사진에서 Auto Generate Animation을 클릭하면 다음과 같은 창이 뜨면서, 해당 Button 컴포넌트의 Transition에 대응되는 state가 미리 만들어져 있는 Animator를 저장할 수 있게 됩니다.

![](/blog/Dev/Unity/t14/02_img.png)

그런데 이 Animator를 들여다보면 신기한 점을 알 수 있습니다. 바로 Animator Controller 에셋 내부에 Animation Clip 에셋이 포함되어 있다는 점입니다.

![](/blog/Dev/Unity/t14/03_img.png)

나는 이것을 보고, 저 Animator Controller(이하 Controller) 에셋을 우클릭하고 Animation (Clip)(이하 Clip)을 추가하면 당연히 저 Controller 안에 Clip이 생길 줄 알았습니다. 그리고 그렇게 하면 에셋 관리하기도 더 편할 것 같다고 생각했습니다.

![](/blog/Dev/Unity/t14/04_img.png)

하지만 위 사진처럼 Controller에 우클릭 후 Clip을 생성해도 다음과 같이 Controller 외부에 Animation이 생성되었습니다.

![](/blog/Dev/Unity/t14/05_img.png)

전에 근무하던 회사에서 복잡한 Animation 에셋 관리 때문에 다소 힘들었던 기억이 있었는데, 위의 Disabled~Selected와 같이 Controller에 종속된 상태의 Clip 집합을 관리하는 것이 상당히 편해 보였습니다. 그래서 저 Button의 Disabled, Highlighted.. 와 같이 Controller 내부에 Clip을 강제로 생성할수 있는 방법을 찾아 보았습니다.

### 2. Animator Controller 내부에 Animation Clip 생성하기

[https://answers.unity.com/questions/1645440/how-to-move-animation-clips-into-animator-controll.html](https://answers.unity.com/questions/1645440/how-to-move-animation-clips-into-animator-controll.html)

[How to move Animation Clips into Animator Controller? - Unity Answers

answers.unity.com](<https://answers.unity.com/questions/1645440/how-to-move-animation-clips-into-animator-controll.html>)

위 글에서는 이미 있는 Clip을 Controller 내부로 집어넣는 방법 + 새로 Clip을 만드는 코드가 소개되어 있습니다. 해당 코드를 참고해서 Controller 내부의 Clip을 삭제하는 기능도 추가해 보았습니다.

```bash
#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;

public class AnimationClipManager
{
    [MenuItem("Assets/Animation/Create Anim Clip", false, 1)]
    static void Create()
    {
        var animController = Selection.activeObject;

        if (animController.GetType() != typeof(AnimatorController))
        {
            Debug.LogWarning("Could not create because the selected object is not an animator controller.");
            return;
        }

        var animClip = new AnimationClip() {name = "Clip Name"};
        AssetDatabase.AddObjectToAsset(animClip, animController);

        string animClipPath = AssetDatabase.GetAssetPath(animClip);
        AssetDatabase.SaveAssets();
    }

    [MenuItem("Assets/Animation/Delete Anim Clip", false, 1)]
    static void Delete()
    {
        var animClip = Selection.activeObject;

        if(animClip.GetType() != typeof(AnimationClip))
        {
            Debug.LogWarning("Could not delete because the selected object is not an animator clip.");
            return;
        }

        AssetDatabase.RemoveObjectFromAsset(animClip);
        AssetDatabase.SaveAssets();
    }
}
#endif
```

위 스크립트를 추가하면 프로젝트 뷰에서 우클릭을 할 경우 다음과 같은 메뉴를 볼 수 있고, 이를 통해 Clip을 생성/삭제할 수 있습니다. 우클릭된 에셋의 타입이 AnimatorController가 아니면 Clip을 생성할 수 없고, AnimationClip이 아니면 삭제할 수 없도록 구현했습니다.

![](/blog/Dev/Unity/t14/06_img.png)

삭제하는 버튼을 만든 이유는, Clip에 대고 Windows의 경우 delete, Mac의 경우 command+delete를 통해 삭제를 시도해보면 다음과 같은 로그를 출력하면서 삭제가 되지 않기 때문입니다. 마찬가지로 이름 변경 또한 불가능합니다.

![](/blog/Dev/Unity/t14/07_img.png)

어쨌든 위의 Controller를 우클릭 후 Create Anim Clip을 클릭하면 아래와 같이 성공적으로 Controller 내부에 Clip이 생성되고, Clip을 우클릭 한 후 Delete Anim Clip을 클릭하면 해당 Clip이 삭제됩니다.

![](/blog/Dev/Unity/t14/08_img.png)

다만 이 메뉴를 통해 Clip을 생성/삭제하면 다음과 같은 Warning이 출력되는 걸 보면, 이 방법을 사용해서 강제로 작업하는 것이 안정적이지 않을 수도 있다는 것을 염두에 두는 것이 좋겠습니다.

![](/blog/Dev/Unity/t14/09_img.png)

### 3. Clip Name 지정

위 코드만을 이용해서 Clip Name을 새로 지정하는 방법은 다음 두 가지가 있습니다.

1. Clip 삭제 후, Script에서 Clip 객체의 name 값을 원하는 값으로 바꾼 뒤 컴파일해서 다시 Create
2. Clip을 추가한 \*.controller 에셋 파일을 직접 text editor로 열어서 "Clip Name"을 검색한 뒤 원하는 이름으로 변경

위 두 방법 모두 너무 불편합니다. 에디터 밖으로 나가지 않고도 손쉽게 설정할 수 있도록 EditorWindow상에서 미리 지정할 이름을 입력하고, 그 데이터를 사용할 수 있도록 구현해 보았습니다.

```bash
#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

public class AnimationClipNameSetter : EditorWindow
{
    public static string clipName = "clip name";

    [MenuItem("SAENS/Animation Clip Name Setter")]
    private static void ShowWindow()
    {
        var window = GetWindow<AnimationClipNameSetter>();
        window.titleContent = new GUIContent("Animation Clip Name Setter");
        window.Show();
    }

    private void OnGUI()
    {
        EditorGUILayout.BeginHorizontal();
        clipName = EditorGUILayout.TextField("Clip Name", clipName);
        EditorGUILayout.EndHorizontal();
    }
}
#endif
```

위 스크립트를 추가하면, 다음과 같이 메뉴가 생기고, 메뉴를 클릭하면 그 다음과 같은 window가 뜹니다.

![](/blog/Dev/Unity/t14/10_img.png)

![](/blog/Dev/Unity/t14/11_img.png)

이제 AnimClipAdder 클래스의 Create 메서드 내 AnimationClip 객체를 생성하는 부분을 다음과 같이 바꿔 줍시다.

```csharp
var animClip = new AnimationClip() {name = AnimationClipNameSetter.clipName};
```

이렇게 코드를 입력하면, Controller에서 Create Anim Clip 메뉴를 통해 Clip을 생성할 때 AnimClipNameSetter 창에서 입력되어 있는 대로 Clip이 생성됩니다.

![](/blog/Dev/Unity/t14/12_img.png)

하지만 아직까지도 부족한 점이 있습니다. 이미 만들어진 Clip의 이름은 바꿀 수 없고, 이름이 맘에 안들면 지우고 다시 만들어야 한다는 점입니다. 이를 보완하기 위해서 AnimationClipManager에서 Rename 메뉴 및 메서드를 추가합니다.

```json
[MenuItem("Assets/Animation/Rename Anim Clip", false, 3)]
static void Rename()
{
    var animClip = Selection.activeObject;

    if (animClip.GetType() != typeof(AnimationClip))
    {
        Debug.LogWarning("Could not rename because the selected object is not an animator clip.");
        return;
    }

    animClip.name = AnimationClipNameSetter.clipName;

    AssetDatabase.SaveAssets();
}
```

위 코드를 추가하면 다음과 같이 새로운 메뉴가 생기고,

![](/blog/Dev/Unity/t14/13_img.png)

클릭하면 다음과 같이 변합니다.

![](/blog/Dev/Unity/t14/14_img.png)

Inspector상에서는 변경된 이름이 잘 반영되었지만 Project View에서는 왜인지 반영되지 않았는데, 다음과 같이 화살표를 두 번 누르면(Controller를 접었다 펴면) 잘 반영되는 것을 확인할 수 있습니다.

![](/blog/Dev/Unity/t14/15_img.png)

### 4. 마치며

이 글에서는, 분명 존재는 하지만 사용자가 직접 에디터에서 생성/변경할 수는 없도록 되어 있는, Animator Controller 에셋의 하위 Animation Clip을 강제로 생성/변경하는 방법을 알아 보았습니다. 강제로 진행한 작업이기 때문에 생성된 Animation Clip이 제대로 동작하지 않을 가능성이 있지만, 이걸 구현하기 위해 이것 저것 찾아보면서 MenuItem, AssetDatabase 등 기존에는 전혀 알지 못했던 많은 것들을 배울 수 있었습니다. 이렇게 배움에는 정말 끝이 없다는 사실이 저를 즐겁게도 하지만 한편으로는 너무 부족한 것 같아 무기력하게 만들기도 합니다.

[전체 코드 Gist](https://gist.github.com/s-saens/e50303677c903f186fb095a0a352b309)

-2022.7.7.THU 세 달 사용 후기-

애니메이터 컨트롤러에서 실제로 사용하는 애니메이션 클립들을 함께 묶어서 관리해보니 너무 편리했습니다. 소규모 프로젝트에서 사용한다면 아주 괜찮을 것 같네요.
단점으로는, 사용한 클립을 다른 애니메이터 컨트롤러에서 재사용하기 힘들다는 점이 있습니다. 즉, 오버라이드 애니메이터 컨트롤러를 사용하기에 무리가 있습니다. 또한 애니메이션 클립이 파일로 저장되는 것이 아니라 컨트롤러 파일에 텍스트로 오브젝트를 쑤셔넣는 거라서, 애니메이션 클립을 수정하는 게 곧 해당 애니메이터 컨트롤러 파일을 수정하는 일이기 때문에 이 점을 유의하지 않으면 협업 시에 충돌이 일어날 수 있습니다!

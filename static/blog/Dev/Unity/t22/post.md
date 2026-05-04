---
title: 'PlayerPrefs - 암호화 및 임의 객체 저장'
date: 2023-04-21 19:43
tistory: https://saens.tistory.com/22
---

PlayerPrefs는 로컬에 필요한 정보를 코드 단 한 줄로 저장할 수 있는 편리한 기능입니다. 하지만 그 이름에서 알 수 있듯이, PlayerPrefs는 Preference, 즉 '사용자 설정'을 저장하기 위한 용도로 사용하는 게 적절합니다. 또한 사용할 수 있는 타입이 Float, Int, String 밖에 없기 때문에 이 상태로 어떤 객체를 저장하기에는 한계가 있습니다.

![](/blog/Dev/Unity/t22/01_img.png)

_세가지 타입_

또한, 디스크에 단순한 텍스트 파일로 저장하기 때문에 데이터를 처리하는 과정이 느리고, 데이터의 양이 많아질 수록 더욱 느려집니다. 정확히는 모르지만 아마 어떤 키 값을 찾기 위해 "텍스트에서 문자열 찾는 알고리즘"이 사용되겠죠. 한 마디로, **보안과 타입, 속도에 한계**가 있는 셈입니다.

모든 정보는 string으로 표현이 됩니다. 그렇기 때문에 사실 string으로 변환만 해준다면 PlayerPrefs로도 어떤 객체든지 담을 수 있습니다. 애초에, 기본적으로 제공되는 float int의 경우에도 내부적으로 string으로 변환하는 과정을 거칩니다. 그리고 string을 암호화해주는 알고리즘은 인터넷에 널리고 널렸습니다. PlayerPrefs에 임의의 T 타입의 객체를 string으로 변환 후, 그걸 암호화해서 저장하고, 데이터가 필요할 때에는 저장된 데이터를 복호화한 후, 그걸 T 타입의 객체로 다시 변환하는 과정을 담당하는 코드를 만들어 두면, 보안도 타입도 걱정할 필요가 없습니다.

저는 **진행 중이던 게임에 대한 정보, 유저 정보**, **세팅값**, **기타 플래그** 등 그리 크지 않은 규모의 데이터를 저장하기 때문에 속도가 느려봤자 얼마나 느려지겠는가 싶어서, 앞의 두 가지 문제만 해결해도 PlayerPrefs를 사용하기에 적절해 보였습니다.

```csharp
using System;
using System.Text;
using System.Security.Cryptography;
using System.Net.NetworkInformation;

public class AES128
{
    private string key {
        get {
            MD5 md5 = MD5.Create();

            string salt = "SoguemSogeumkkzz";
            byte[] result = md5.ComputeHash(Encoding.UTF8.GetBytes(salt));
            return Encoding.UTF8.GetString(result);
        }
    }

    RijndaelManaged rijndaelCipher;

    public AES128()
    {
        rijndaelCipher = new RijndaelManaged();

        rijndaelCipher.Mode = CipherMode.CBC;
        rijndaelCipher.Padding = PaddingMode.PKCS7;
        rijndaelCipher.KeySize = 128;
        rijndaelCipher.BlockSize = 128;
    }

    public string Encrypt(string textToEncrypt)
    {
        byte[] pwdBytes = Encoding.UTF8.GetBytes(key);
        byte[] keyBytes = new byte[16];

        int len = pwdBytes.Length;
        if (len > keyBytes.Length) len = keyBytes.Length;

        Array.Copy(pwdBytes, keyBytes, len);

        rijndaelCipher.Key = keyBytes;
        rijndaelCipher.IV = keyBytes;

        ICryptoTransform transform = rijndaelCipher.CreateEncryptor();

        byte[] plainText = Encoding.UTF8.GetBytes(textToEncrypt);

        return Convert.ToBase64String(transform.TransformFinalBlock(plainText, 0, plainText.Length));
    }

    public string Decrypt(string textToDecrypt)
    {
        byte[] encryptedData = Convert.FromBase64String(textToDecrypt);
        byte[] pwdBytes = Encoding.UTF8.GetBytes(key);
        byte[] keyBytes = new byte[16];

        int len = pwdBytes.Length;
        if (len > keyBytes.Length) len = keyBytes.Length;

        Array.Copy(pwdBytes, keyBytes, len);

        rijndaelCipher.Key = keyBytes;
        rijndaelCipher.IV = keyBytes;

        byte[] plainText = rijndaelCipher.CreateDecryptor().TransformFinalBlock(encryptedData, 0, encryptedData.Length);

        return Encoding.UTF8.GetString(plainText);
    }
}
```

```csharp
using UnityEngine;
using Newtonsoft.Json;

public static class PlayerPrefsExt
{
    private static AES128 aes128 = new AES128();

    public static void SetObject<T>(string key, T value, bool encryption = true)
    {
        string jsonValue = JsonConvert.SerializeObject(value, JsonSettings.Settings);

        string savingKey = encryption ? aes128.Encrypt(key) : key;
        string savingValue = encryption ? aes128.Encrypt(jsonValue) : jsonValue;

        PlayerPrefs.SetString(savingKey, savingValue);
    }

    public static T GetObject<T>(string originalKey, T defaultValue = default(T), bool encryption = true)
    {
        string savedKey = encryption ? aes128.Encrypt(originalKey) : originalKey;
        string savedValue;

        if(!PlayerPrefs.HasKey(savedKey))
        {
            return defaultValue;
        }

        savedValue = PlayerPrefs.GetString(savedKey, "");
        string originalValue = encryption ? aes128.Decrypt(savedValue) : savedValue;

        if(originalValue == "") return defaultValue;

        return JsonConvert.DeserializeObject<T>(originalValue);
    }

    public static bool HasKey(string key, bool encryption = true)
    {
        key = encryption ? aes128.Encrypt(key) : key;
        return PlayerPrefs.HasKey(key);
    }
    public static void DeleteKey(string key, bool encryption = true)
    {
        key = encryption ? aes128.Encrypt(key) : key;
        PlayerPrefs.DeleteKey(key);
    }
}
```

파라미터의 encryption 값의 참/거짓 여부에 따라 암호화 여부가 결정되고, 암호화 하기로 되었다면 value를 Json Serialize한 후 key와 함께 암호화 하여 저장하거나, 불러온 데이터를 복호화 하여 Json Deserialize합니다. Json 작업은 Newtonsoft의 .NET Json을 이용했습니다. HasKey, DeleteKey도 암호화 여부에 따라 결과가 달라지기 때문에 따로 구현해야 합니다.

이제 다음과 같이 편하게 로컬에 저장된 데이터를 저장하거나 불러올 수 있습니다!

```csharp
public Person
{
    string name = "SAENS"
    int age = 25;
}

public class TestScript : MonoBehaviour
{
    void Start()
    {
     PlayerPrefsExt.SetObject<Person>("Person Key", "", true);
    }
}
```

[PlayerPrefs Editor](https://assetstore.unity.com/packages/tools/utilities/playerprefs-editor-167903) 에셋을 추가하시면 다음과 같이 Key와 Value를 에디터에서 보고 수정도 할 수 있습니다. 물론 직접 본인이 .plist 파일을 찾아서 열어도 되지만 이게 참 편하더라구요. 다만 여기서 암호화 된 친구를 수정하면 안되겠죠.

![](/blog/Dev/Unity/t22/02_img.png)

_암호화된 PlayerPrefs 내의 데이터_

---

저의 경우에는 20개 이상의 데이터를 저장하고 그 중에는 월드맵 객체와 같은, 필드가 상당히 많고 그 구조가 복잡한 것들도 몇 개 포함되어 있습니다. 그리고 키와 값 모두 암호화되기 때문에 그 길이가 원래보다 길어지게 되죠. 그래서 수학적으로는 확실히 전보다 느려졌을 겁니다. 하지만 저는 실제 [프로젝트](https://saens.xyz/projects/iMaze)에서 크게 체감하지 못했고, 개발 속도에 꽤 큰 도움을 줬기 때문에 적극 추천 드립니다.

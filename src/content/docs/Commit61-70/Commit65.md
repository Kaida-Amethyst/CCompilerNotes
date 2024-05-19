---
title: 65. Sizeof Type Support
---

## commit log

```plaintext
    Make sizeof to accept not only an expression but also a typename
  
    Previously, chibicc's sizeof accepted only an expression, so you
    couldn't write something like `sizeof(int)`. Now it accepts that.
```

我们先前的`sizeof`都只是接受一个表达式，但是实际当中的C语言中，sizeof接受的可以是类型，例如：

```c
sizeof(int)
sizeof(char[3][4])
```

我们可以这么做，看`sizeof`括号后是否是一个typename，如果是的话，就启动一个伪声明，获取这个类型的size。（不过实际当中的C语言其实也接受类似于`sizeof int`这种写法）

## Parser

```c
static Node *primary(Token **rest, Token *tok) {
  Token *start = tok;
  // code
  if (equal(tok, "sizeof") && equal(tok->next, "(") && is_typename(tok->next->next)) {
    Type *ty = typename(&tok, tok->next->next);
    *rest = skip(tok, ")");
    return new_num(ty->size, start);
  }
  // code
}
```

其中调用了`typename`函数，用以获取类型，这里我们将其实现：

```c
static Type* typename(Token **rest, Token *tok) {
  Type *ty = declspec(&tok, tok, NULL);
  return abstract_declarator(rest, tok, ty);
}
```

这里用`declspec`来识别基本类型，再用`abstract_declarator`来识别整体类型：

```c
static Type* abstract_declarator(Token **rest, Token *tok, Type *ty) {
  while(equal(tok, "*")) {
    ty = pointer_to(ty);
    tok = tok->next;
  }

  if (equal(tok, "(")) {
    Token *start = tok;
    Type dummy = {};
    abstract_declarator(&tok, start->next, &dummy);
    tok = skip(tok, ")");
    ty = type_suffix(rest, tok, ty);
    return abstract_declarator(&tok, start->next, ty);
  }
  return type_suffix(rest, tok, ty);
}
```

这样就完成了，然后我们来添加测例：

## 测例

```c
// sizeof.c
#include "test.h"

int main() {
  ASSERT(1, sizeof(char));
  ASSERT(2, sizeof(short));
  ASSERT(2, sizeof(short int));
  ASSERT(2, sizeof(int short));
  ASSERT(4, sizeof(int));
  ASSERT(8, sizeof(long));
  ASSERT(8, sizeof(long int));
  ASSERT(8, sizeof(long int));
  ASSERT(8, sizeof(char *));
  ASSERT(8, sizeof(int *));
  ASSERT(8, sizeof(long *));
  ASSERT(8, sizeof(int **));
  ASSERT(8, sizeof(int(*)[4]));
  ASSERT(32, sizeof(int*[4]));
  ASSERT(16, sizeof(int[4]));
  ASSERT(48, sizeof(int[3][4]));
  ASSERT(8, sizeof(struct {int a; int b;}));

  printf("OK\n");
  return 0;
}

```

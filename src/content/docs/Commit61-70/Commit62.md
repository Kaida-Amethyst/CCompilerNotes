---
title: 62. Complex Types Decoding
---

## commit log

```plaintext
Handle complex type declarations correctly

chibicc can now read complex type declarations such as below.

long x;
long int x;
int long x;
short x;
short int x;
int short x;
long long x;
long long int x;
```

## Parser

要能够识别由多个单词组成的类型。

这就需要修改语法分析中对类型的识别语句了。我们可以在代码中人工地去添加这么几种形式。但是这样似乎显得有些麻烦。我们可以给每种类型添加一个编码，譬如`int`有一个编码，然后`long`有一个编码，当遇到`int long`将两个编码相加，这样`long int`和`int long`的编码之和是一定的，并且据此来判断这个是一个`long`型。

这样一来，一个比较重要的问题就是怎么去设计这个编码了。

```c
static Type *declspec(Token **rest, Token *tok) {
  enum {
    VOID  = 1 << 0,
    CHAR  = 1 << 2,
    SHORT = 1 << 4,
    INT   = 1 << 6,
    LONG  = 1 << 8,
    OTHER = 1 << 10,
  };

  Type *ty = ty_int;
  int counter = 0;
  while(is_typename(tok)) {
    // 首先需要处理struct和union的情况
    if (equal(tok, "struct") || equal(tok, "uniom")) {
      if (equal(tok, "struct"))
        ty = struct_decl(&tok, tok->next);
      else 
        ty = union_decl(&tok, tok->next);
      counter += OTHER;
      continue;
    }

    if (equal(tok, "void")) 
      counter += VOID;
    else if (equal(tok, "char"))
      counter += CHAR;
    else if (equal(tok, "short"))
      counter += SHORT;
    else if (equal(tok, "int"))
      counter += INT;
    else if (equal(tok, "long"))
      counter += LONG;
    else
      unreachable();

     switch (counter) {
     case VOID:
       ty = ty_void; break;
     case CHAR:
       ty = ty_char; break;
      case SHORT:
      case SHORT+INT:
        ty = ty_short; break;
      case INT:
        ty = ty_int; break;
      case LONG:
      case LONG + INT:
        ty = ty_long; break;
      default:
        error_tok(tok, "invalid type");
     }
     tok  = tok ->next;
  }
  *rest = tok;
  return ty;
}
```

## 测例

```c
// decl.c
#include "test.h"

int main() {
  ASSERT(1, ({ char x; sizeof(x); }));
  ASSERT(2, ({ short int x; sizeof(x); }));
  ASSERT(2, ({ int short x; sizeof(x); }));
  ASSERT(4, ({ int x; sizeof(x); }));
  ASSERT(8, ({ long int x; sizeof(x); }));
  ASSERT(8, ({ int long x; sizeof(x); }));

  printf("OK\n");
  return 0;
}
```

‍

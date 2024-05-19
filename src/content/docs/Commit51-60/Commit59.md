---
title: 59. Nested Type Declarators
---

## commit log

```plaintext
Add nested type declarators
```

看下面两行代码：

```c
char *x[3];   // char* 数组，里面有3个char*
char (*x)[3]; // 实际上是2维度数组，但是第一个维度未知。
```

上面的代码中的第二种情况，实际上是不可以直接用在代码中的，它的最大最终是出现在函数声明的地方，指示这里要传入一个二维数组。

所以此处的修改，实际上是为下一个commit铺路，我们下一次commit要允许传入大类型。

## Parser

```c
static Type *declarator(Token **rest, Token *tok, Type *ty) {
  while(consume(&tok, tok, "*"))
    ty = pointer_to(ty);

  if (equal(tok, "(")) {
    Token *start = tok;
    Type dummy = {};
    declarator(&tok, start->next, &dummy);
    tok = skip(tok, ")");
    ty = type_suffix(rest, tok, ty);
    return declarator(&tok, start->next, ty);
  }

  if(tok->kind != TK_IDENT)
    error_tok(tok, "expected a variable name");
  ty = type_suffix(rest, tok->next, ty);
  return ty;
}
```

## test.sh

```c
// variable.c
  ASSERT(24, ({ char *x[3]; sizeof(x); }));
  ASSERT(8, ({ char (*x)[3]; sizeof(x); }));
  ASSERT(1, ({ char (x); sizeof(x); }));
  ASSERT(3, ({ char (x)[3]; sizeof(x); }));
  ASSERT(12, ({ char (x[3])[4]; sizeof(x); }));
  ASSERT(4, ({ char (x[3])[4]; sizeof(x[0]); }));
  ASSERT(3, ({ char *x[3]; char y; x[0]=&y; y=3; x[0][0]; }));
  ASSERT(4, ({ char x[3]; char (*y)[3]=x; y[0][0]=4; y[0][0]; }));
```

---
title: 99. String Literal Initializers
---

## commit log

```plaintext
Add string literal initializer
```

添加字符串字面量。就是允许类似下面的初始化：

```c
char x[4] = "abc";
```

有了前一次commit的基础之后，这一次commit就好写多了。

## Parser

```c
// string-initializer = string-literal
static void string_initializer(Token **rest, Token *tok, Initializer *init) {
  int len = MIN(init->ty->array_len, tok->ty->array_len);
  for(int i = 0; i < len; i++)
    init->children[i]->expr = new_num(tok->str[i], tok);
  *rest = tok->next;
}

// array-initializer = "{" initialzier ("," initializer) * "}"
static void array_initializer(Token **rest, Token *tok, Initializer *init) {
  tok = skip(tok, "{");
  for(int i = 0; !consme(rest, tok, "}"); i++) {
    if (i > 0)
      tok = skip(tok, ",");

    if (i < init->ty->array_len)
      initialzier2(&tok, tok, init->children[i])
    else
      tok = skip_excess_element(tok);
  }
}

// initialzier = string-initialzier | array-initializer | assign
static void initialzier2(Token **rest, Token *tok, Initialzier *init) {
  if (init->ty->kind == TY_ARRAY && tok->kind == TK_STR) {
    string_initializer(rest, tok, init);
    return ;
  }
  if (init->ty->kind == TY_ARRAY) {
    array_initialzier(rest, tok, init);
    return ;
  }
}
```

注意这里面用到了`MIN`宏，我们把`MAX`和`MIN`宏一并加上：

```c
#define MAX(x, y) ((x) < (y) ? (y) : (x))
#define MIN(x, y) ((x) < (y) ? (x) : (y))
```

## test

```c
// initializer.c
  ASSERT('a', ({ char x[4]="abc"; x[0]; }));
  ASSERT('c', ({ char x[4]="abc"; x[2]; }));
  ASSERT(0, ({ char x[4]="abc"; x[3]; }));
  ASSERT('a', ({ char x[2][4]={"abc","def"}; x[0][0]; }));
  ASSERT(0, ({ char x[2][4]={"abc","def"}; x[0][3]; }));
  ASSERT('d', ({ char x[2][4]={"abc","def"}; x[1][0]; }));
  ASSERT('f', ({ char x[2][4]={"abc","def"}; x[1][2]; }));
```

---
title: 14. Null Statements
---

## Commit log

```plaintext
Add null statement
```

我们现在的编译器实际上是不支持空语句的，像这样的语句会报错：

```shell
$./chibicc "{;;1;}"
{;;1;}
 ^ expected an expression
```

## 思路

它的问题实际上出在这个函数上：

```c
static Node *expr_stmt(Token **rest, Token *tok) {
  Node *node = new_unary(ND_EXPR_STMT, expr(&tok, tok));
  *rest = skip(tok, ";");
  return node;
}
```

这个函数会递归向下调用，但是遇到的第一个字符是`;`，就会出错，这里有两种思路，一种是在primary的时候检测这个`;`，另一种也就是chibicc中的做法，直接在上面这个函数里面检测`;`，不过我们还是要返回一个node，我们就直接返回一个ND_BLOCK就好了，反正最后生成代码的时候，这个block是空的，那么就什么也不做。

```c
static Node *expr_stmt(Token **rest, Token *tok) {
  if (equal(tok, ";")) {
    *rest = tok->next;
    return new_node(ND_BLOCK);
  }

  Node *node = new_unary(ND_EXPR_STMT, expr(&tok, tok));
  *rest = skip(tok, ";");
  return node;
}
```

## test.sh

添加一个测例：

```bash
assert 5 '{ ;;; return 5; }'
```

‍

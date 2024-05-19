---
title: 30. Sizeof Operator
---

## commit log

```plaintext
Add sizeof
```

添加sizeof操作。

## 思路

sizeof是C中的一个关键字。很多情况下，我们会将其误认为是一个函数，其实是不对的。在C的标准当中，一个`sizeof(int)`，它直接就是4，没有其它什么别的运算了。所以，这个sizeof，它不能被认为是一种运算，而是与后面的表达式合在一起作为一种基本元素存在，因此sizeof的功能添加，就要着眼于`primary`，而并非`unary`。

## Lexer

首先要添加一种关键字：

```c
static bool is_keyword(Token *tok) {
  sttaic char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof",
  };
  /*  other code */
}
```

## Parser

我们修改primary函数：

```c
static Node *primary(Token **rest, Token *tok) {
  /*  other cases */
  if (equal(tok, "sizeof")) {
    // 注意这里我们虽然new出了一个node，但是并不把它加到任何一个主体
    // 用于代码生成的树上去，我们仅仅是为了调用add_type
    Node *node = unary(rest, tok->next);
    add_type(node);
    return new_num(node->ty->size, tok);
  }
  /*  other cases  */
}
```

## test.sh

添加以下测例：

```bash
assert 8 'int main() { int x; return sizeof(x); }'
assert 8 'int main() { int x; return sizeof x; }'
assert 8 'int main() { int *x; return sizeof(x); }'
assert 32 'int main() { int x[4]; return sizeof(x); }'
assert 96 'int main() { int x[3][4]; return sizeof(x); }'
assert 32 'int main() { int x[3][4]; return sizeof(*x); }'
assert 8 'int main() { int x[3][4]; return sizeof(**x); }'
assert 9 'int main() { int x[3][4]; return sizeof(**x) + 1; }'
assert 9 'int main() { int x[3][4]; return sizeof **x + 1; }'
assert 8 'int main() { int x[3][4]; return sizeof(**x + 1); }'
assert 8 'int main() { int x=1; return sizeof(x=2); }'    # 注意下面两个有趣的例子
assert 1 'int main() { int x=1; sizeof(x=2); return x; }'
```

‍

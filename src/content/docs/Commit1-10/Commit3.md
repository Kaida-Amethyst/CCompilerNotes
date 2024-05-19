---
title: 3. Token Space Handling
---

## Commit log

```plaintext
Add a tokenizer to allow space characters between tokens.
```

上一个commit里面，我们的表达式是不允许有空格的，这一次我们需要可以编译带空格的表达式。稍微需要注意的是，我们的chibicc还是从标准输入中读取表达式，但这一次因为有空格，我们需要使用单引号将内容括起来。

## 用法

```shell
$ ./chibicc '1 + 2 - 3'
```

## 思考

如果我们只是想达成这样一个效果的话，那当然我们只要在上一个commit的基础上，就简单地添加一个跳过空格的操作即可。但是这不符合我们的目的，因为我们后面支持越来越多的特性，每一次只是小修小补，最后会使得程序越来越臃肿。我们需要换一种思路。

我们把表达式字符串，转换成一系列token的链表，譬如上面的`1 + 2 - 3`，可以将其解析为：

```plaintext
(Num, 1) -> (Sym, +) -> (Num, 2) -> (Sym, -) -> (Num, 3)
```

然后再从左往右扫描这个链表，插入相对应的指令就好。

以上实际上就是词法分析的过程。

## Token

我们首先来实现Token，首先确定Token的类型：

```c
typedef enum {
  TK_PUNCT,
  TK_NUM,
  TK_EOF,
} TokenKind;
```

就目前而言，我们暂时只有三种Token，`TK_PUNCT`用来指符号，`TK_NUM`指数字，`TK_EOF`用来指示一个链表的结束。

然后是Token结构体：

```c
typedef struct Token Token;
struct Token{
  TokenKind kind;
  Token *next;      // next token
  int val;          // 如果Kind是TK_NUM，那么有值
  char *loc;        // 指示token在表达式字符串中的位置
  int len;          // 指示token的长度
};
```

然后我们来为这个结构体添加初始化方法：

```c
static Token * new_token(TokenKind kind, char *start, char* end) {
  Token *tok = calloc(1, sizeof(Token));
  tok->kind = kind;
  tok->loc = start;
  tok->len = end - start;
  return tok;
}
```

关于`calloc`可参考((20220609111832-1aqwoyx 'calloc'))：

接着，我们就可以来写解析字符串的函数了：

```c
static Token *tokenize(char *p) {
  Token head = {};
  Token *cur = &head;
  while(*p) {
    if (isspace(*p)) {p++; continue; }

    if (isdigit(*p)) {
      cur = cur->next = new_token(TK_NUM, p, p);
      char *q = p;
      cur->val = strtoul(p, &p, 10);
      cur->len = p - q;
      continue;
    }
  
    if (*p == '+' || *p == '-') {
      cur = cur->next = new_token(TK_PUNCT, p, p+1);
      p++;
      continue;
    }

    error("invalid token");
  }
  cur = cur->next = new_token(TK_EOF, p, p);
  return head.next;
}
```

注意上面用到了`isspace`和`isdigit`，所以需要引入`ctype.h`头文件。

另外这里使用到了连等，这个技巧在C语言中是存在的。

```c
cur = cur->next = new_token(TK_NUM, p, p);
```

相当于：

```c
cur = cur->next;
cur = new_token(TK_NUM, p, p);
```

另外需要注意这里的链表的写法，是先有一个head，作为哨兵，因为在更一般的情形下，我们通常不知道链表的头是什么类型的。最终返回的时候返回head.next，作为链表的真正起点。

那么这样一来的话，就需要把head给free掉，实际上上面的代码里面，head是是直接放到栈里面的，这样就省掉了malloc和free的过程。

然后，因为我们在最终生成的x86汇编中，需要使用到token具体的值，因此我们还需要一个`get_number`函数：

```c
static int get_number(Token *tok) {
  if (tok->kind != TK_NUM) {
    error("expected a number!");
  }
  return tok->val;
}
```

这里面要做一个检查，里面用到了一个error函数，这里我们补充上：

```c
static void error(char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  fprintf(stderr, "\n");
  exit(1);
}

```

上面的函数是一个可变参数函数，使用到了`va_list`和`va_start`宏，需要引入`stdargs.h`头文件。

然后是equal函数，因为当扫描到非数字时，要去判断它们是`+`还是`-`。

```c
static bool equal(Token *tok, char *op) {
  return memcmp(tok->loc, op, tok->len) == 0 && op[tok->len] == '\0';
}
```

最后一个需要的函数是skip函数，用来当我们遇到某一个特定的token时，直接前进。尽管在目前看来，这个skip函数稍微有些多余，但是实际上后面会需要用到：

```c
static Token *skip(Token *tok, char *s) {
  if (!equal(tok, s)) {
    error("expected '%s', s");
  }
  return tok->next;
}
```

然后，我们就可以来写我们的main函数了：

```c
int main (int argc, char** argv) {
  if (argc != 2) {
    fprintf(stderr, "%s, invalid number of arguments.\n", argv[0]);
    return 1;
  }

  Token *tok = tokenize(argv[1]);

  printf("  .global main\n");
  printf("main:\n");
  printf("  mov $%d, %%rax\n", get_number(tok));
  tok = tok->next;

  while (tok->kind != TK_EOF) {
    if (equal(tok, "+")) {
      printf("  add $%d, %%rax\n", get_number(tok->next));
      tok = tok->next->next;
      continue;
    }
    tok = skip(tok, "-");
    printf("  sub $%d, %%rax\n", get_number(tok));
    tok = tok->next;
  }

  printf("  ret\n");
  return 0;
}
```

main函数比较简单，就是扫描整个链表，然后插入指令。

## test.sh

在test.sh里面加入新的测例：

```bash
assert 21 '5 + 20 - 4'
```

然后make, make test，可以通过测例。

‍
